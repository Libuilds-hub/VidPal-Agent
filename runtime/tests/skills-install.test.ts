// runtime/tests/skills-install.test.ts —— 技能安装/上传/卸载（临时目录注入，不碰真实 skills/）
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import os from "os"
import path from "path"
import { catalogSkills } from "../skills/install"
import { SKILL_CATALOG } from "../skills/catalog"

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
