// runtime/tests/skills-registry.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import os from "os"
import path from "path"
import { scanSkillsDir, loadSkill, type SkillIndexEntry } from "../skills/registry"

function makeSkillsDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rt-skills-"))
  const skillDir = path.join(root, "video-study")
  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: video-study\ndescription: 测试技能\ndescription2: 忽略我\nversion: 1.2.0\ndefault: true\n---\n\n# 标题\n\n规则内容"
  )
  return root
}

test("scanSkillsDir：解析 frontmatter 索引", () => {
  const root = makeSkillsDir()
  try {
    const index = scanSkillsDir(root)
    assert.equal(index.length, 1)
    const entry = index[0] as SkillIndexEntry
    assert.equal(entry.name, "video-study")
    assert.equal(entry.version, "1.2.0")
    assert.equal(entry.default, true)
    assert.equal(entry.description, "测试技能")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("loadSkill：返回完整 markdown 内容；未知技能返回 null", () => {
  const root = makeSkillsDir()
  try {
    const content = loadSkill(root, "video-study")
    assert.ok(content)
    assert.match(content, /# 标题/)
    assert.match(content, /规则内容/)
    assert.equal(loadSkill(root, "nope"), null)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
