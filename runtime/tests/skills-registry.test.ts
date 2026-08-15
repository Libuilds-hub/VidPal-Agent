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

test("loadSkill：路径穿越被拒（../secret、..\\..\\x、a/b）", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "rt-skills-trav-"))
  try {
    const root = path.join(parent, "level1", "skills")
    fs.mkdirSync(root, { recursive: true })
    // root 之外放置旧实现可读到的 SKILL.md：path.join(root, "../secret") 命中
    // level1/secret，path.join(root, "..\\..\\x")（Windows 反斜杠即分隔符）命中
    // parent/x —— 旧实现会返回其内容（漏洞），修复后必须一律 null
    fs.mkdirSync(path.join(parent, "level1", "secret"), { recursive: true })
    fs.writeFileSync(path.join(parent, "level1", "secret", "SKILL.md"), "---\nname: secret\n---\n\n外部机密A")
    fs.mkdirSync(path.join(parent, "x"), { recursive: true })
    fs.writeFileSync(path.join(parent, "x", "SKILL.md"), "---\nname: x\n---\n\n外部机密B")

    assert.equal(loadSkill(root, "../secret"), null, "../secret 不得穿越出 root")
    assert.equal(loadSkill(root, "..\\..\\x"), null, "反斜杠路径不得穿越出 root")
    assert.equal(loadSkill(root, "a/b"), null, "含斜杠的名称不得通过白名单")
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})

test("scanSkillsDir：frontmatter name 与目录名不一致的技能被跳过", () => {
  const root = makeSkillsDir()
  try {
    const fooBar = path.join(root, "foo-bar")
    fs.mkdirSync(fooBar)
    fs.writeFileSync(
      path.join(fooBar, "SKILL.md"),
      "---\nname: Foo Bar\ndescription: 键不一致\nversion: 0.1.0\n---\n\n内容"
    )
    const index = scanSkillsDir(root)
    assert.equal(index.length, 1, "foo-bar（frontmatter name 与目录名不一致）必须被跳过")
    assert.equal(index[0]!.name, "video-study")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("scanSkillsDir：单个坏技能目录（SKILL.md 是目录）不炸整个扫描", () => {
  const root = makeSkillsDir()
  try {
    const broken = path.join(root, "broken")
    // SKILL.md 是目录 → 旧实现 readFileSync 抛 EISDIR 炸掉整个扫描
    fs.mkdirSync(path.join(broken, "SKILL.md"), { recursive: true })
    const index = scanSkillsDir(root) // 不得抛错
    assert.equal(index.length, 1)
    assert.equal(index[0]!.name, "video-study")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("scanSkillsDir：SKILL.md 超过 10MB 的技能被跳过", () => {
  const root = makeSkillsDir()
  try {
    const huge = path.join(root, "huge")
    fs.mkdirSync(huge)
    fs.writeFileSync(
      path.join(huge, "SKILL.md"),
      "---\nname: huge\n---\n\n" + "x".repeat(10 * 1024 * 1024 + 1)
    )
    const index = scanSkillsDir(root)
    assert.equal(index.length, 1, "超过 10MB 的 SKILL.md 必须被跳过")
    assert.equal(index[0]!.name, "video-study")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("scanSkillsDir：default: false 与缺省均解析为 false", () => {
  const root = makeSkillsDir()
  try {
    const optional = path.join(root, "optional")
    fs.mkdirSync(optional)
    fs.writeFileSync(path.join(optional, "SKILL.md"), "---\nname: optional\ndefault: false\n---\n\n内容")
    const noDefault = path.join(root, "no-default")
    fs.mkdirSync(noDefault)
    fs.writeFileSync(path.join(noDefault, "SKILL.md"), "---\nname: no-default\n---\n\n内容")
    const index = scanSkillsDir(root)
    assert.equal(index.find((e) => e.name === "optional")?.default, false)
    assert.equal(index.find((e) => e.name === "no-default")?.default, false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("scanSkillsDir：空技能目录返回空数组", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rt-skills-empty-"))
  try {
    assert.deepEqual(scanSkillsDir(root), [])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("scanSkillsDir：BOM 前缀不影响 frontmatter 解析", () => {
  const root = makeSkillsDir()
  try {
    const bom = path.join(root, "bom-skill")
    fs.mkdirSync(bom)
    fs.writeFileSync(
      path.join(bom, "SKILL.md"),
      "\uFEFF---\nname: bom-skill\ndescription: BOM描述\nversion: 3.1.4\n---\n\n内容"
    )
    const index = scanSkillsDir(root)
    const entry = index.find((e) => e.name === "bom-skill")
    assert.ok(entry, "BOM 前缀的技能应被解析")
    assert.equal(entry!.description, "BOM描述")
    assert.equal(entry!.version, "3.1.4")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
