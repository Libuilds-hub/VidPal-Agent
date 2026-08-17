// runtime/tests/skills-install.test.ts —— 技能安装/上传/卸载（临时目录注入，不碰真实 skills/）
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import os from "os"
import path from "path"
import { SkillError, catalogSkills, installCuratedSkill, deleteSkill } from "../skills/install"
import { SKILL_CATALOG } from "../skills/catalog"
import { scanSkillsDir } from "../skills/registry"

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skills-install-"))
}

test("catalogSkills：返回精选列表且 preinstalled 与实际一致", () => {
  const root = tmpRoot()
  try {
    const all = catalogSkills(root)
    assert.equal(all.length, SKILL_CATALOG.length)
    assert.ok(all.every((s) => s.preinstalled === false))
    assert.ok(all.some((s) => s.name === "video-study"))
    // 安装一个后 preinstalled 应变 true
    fs.mkdirSync(path.join(root, "video-study"), { recursive: true })
    fs.writeFileSync(
      path.join(root, "video-study", "SKILL.md"),
      "---\nname: video-study\ndescription: x\n---\n# x"
    )
    const after = catalogSkills(root)
    assert.equal(after.find((s) => s.name === "video-study")?.preinstalled, true)
    assert.equal(after.find((s) => s.name === "web-research")?.preinstalled, false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("installCuratedSkill：安装成功落盘且扫描器可识别", () => {
  const root = tmpRoot()
  try {
    const meta = installCuratedSkill(root, "web-research")
    assert.equal(meta.name, "web-research")
    const file = path.join(root, "web-research", "SKILL.md")
    assert.ok(fs.existsSync(file))
    assert.match(fs.readFileSync(file, "utf-8"), /^---\r?\nname: web-research/)
    assert.ok(scanSkillsDir(root).some((s) => s.name === "web-research"))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("installCuratedSkill：重复安装 409 / 非法名 400 / 不在目录 404", () => {
  const root = tmpRoot()
  try {
    installCuratedSkill(root, "mindmap")
    assert.throws(() => installCuratedSkill(root, "mindmap"), (e: unknown) => e instanceof SkillError && e.status === 409)
    assert.throws(() => installCuratedSkill(root, "../evil"), (e: unknown) => e instanceof SkillError && e.status === 400)
    assert.throws(() => installCuratedSkill(root, "no-such-skill"), (e: unknown) => e instanceof SkillError && e.status === 404)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("deleteSkill：删除成功 / 不存在 404 / 非法名 400", () => {
  const root = tmpRoot()
  try {
    installCuratedSkill(root, "video-notes")
    deleteSkill(root, "video-notes")
    assert.ok(!fs.existsSync(path.join(root, "video-notes")))
    assert.throws(() => deleteSkill(root, "video-notes"), (e: unknown) => e instanceof SkillError && e.status === 404)
    assert.throws(() => deleteSkill(root, "../escape"), (e: unknown) => e instanceof SkillError && e.status === 400)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
