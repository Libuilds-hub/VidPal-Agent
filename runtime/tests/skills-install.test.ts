// runtime/tests/skills-install.test.ts —— 技能安装/上传/卸载（临时目录注入，不碰真实 skills/）
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import os from "os"
import path from "path"
import zlib from "node:zlib"
import yazl from "yazl"
import type { Entry } from "yauzl"
import {
  SkillError,
  catalogSkills,
  installCuratedSkill,
  deleteSkill,
  uploadSkillZip,
  isSymlink,
  MAX_ZIP_BYTES,
} from "../skills/install"
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

function makeZip(files: Record<string, string>): Promise<Buffer> {
  const zip = new yazl.ZipFile()
  for (const [name, content] of Object.entries(files)) {
    zip.addBuffer(Buffer.from(content), name)
  }
  zip.end()
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    zip.outputStream.on("data", (c: Buffer) => chunks.push(c))
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)))
    zip.outputStream.on("error", reject)
  })
}

/** 手写最小 ZIP（不经过 yazl 的路径校验），用于构造 zip-slip 等恶意条目 */
function makeRawZip(files: Record<string, string>): Buffer {
  const entries = Object.entries(files).map(([name, content]) => ({ name, data: Buffer.from(content) }))
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf-8")
    const crc = zlib.crc32(data)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0) // local file header signature
    header.writeUInt16LE(20, 4) // version needed to extract
    header.writeUInt16LE(0x0800, 6) // general purpose flag: UTF-8
    header.writeUInt16LE(0, 8) // compression method: store
    header.writeUInt32LE(0, 10) // mod time / mod date
    header.writeUInt32LE(crc, 14)
    header.writeUInt32LE(data.length, 18) // compressed size
    header.writeUInt32LE(data.length, 22) // uncompressed size
    header.writeUInt16LE(nameBuf.length, 26)
    header.writeUInt16LE(0, 28) // extra field length
    chunks.push(header, nameBuf, data)
    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0) // central directory signature
    centralHeader.writeUInt16LE(20, 4) // version made by
    centralHeader.writeUInt16LE(20, 6) // version needed to extract
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt32LE(0, 12)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(nameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38) // external attributes
    centralHeader.writeUInt32LE(offset, 42) // local header offset
    central.push(centralHeader, nameBuf)
    offset += 30 + nameBuf.length + data.length
  }
  const centralDir = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // end of central directory signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // central directory disk
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDir.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20) // comment length
  return Buffer.concat([...chunks, centralDir, eocd])
}

test("uploadSkillZip：结构 2（单层文件夹）安装并保留附属文件", async () => {
  const root = tmpRoot()
  try {
    const buf = await makeZip({
      "my-tool/SKILL.md": "---\nname: my-tool\ndescription: 测试技能\nversion: 0.1.0\n---\n\n# 测试\n",
      "my-tool/scripts/run.js": "console.log('hi')",
    })
    const meta = await uploadSkillZip(root, buf)
    assert.equal(meta.name, "my-tool")
    assert.equal(meta.description, "测试技能")
    assert.ok(fs.existsSync(path.join(root, "my-tool", "SKILL.md")))
    assert.equal(fs.readFileSync(path.join(root, "my-tool", "scripts", "run.js"), "utf-8"), "console.log('hi')")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("uploadSkillZip：结构 1（根目录 SKILL.md）", async () => {
  const root = tmpRoot()
  try {
    const buf = await makeZip({
      "SKILL.md": "---\nname: root-skill\ndescription: 根技能\n---\n\n# x\n",
      "assets/a.txt": "a",
    })
    const meta = await uploadSkillZip(root, buf)
    assert.equal(meta.name, "root-skill")
    assert.ok(fs.existsSync(path.join(root, "root-skill", "assets", "a.txt")))
    assert.ok(scanSkillsDir(root).some((s) => s.name === "root-skill"))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("uploadSkillZip：zip-slip 路径逐项拒绝", async () => {
  const root = tmpRoot()
  try {
    const evilPaths = [
      "../evil/SKILL.md",
      "..\\evil\\SKILL.md",
      "/abs/SKILL.md",
      "C:/evil/SKILL.md",
      "a/../../evil/SKILL.md",
    ]
    for (const evil of evilPaths) {
      const buf = makeRawZip({ "ok/SKILL.md": "---\nname: ok\n---\n# ok", [evil]: "x" })
      await assert.rejects(
        () => uploadSkillZip(root, buf),
        (e: unknown) => e instanceof SkillError && e.status === 400
      )
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("uploadSkillZip：缺 SKILL.md / 多个 SKILL.md / frontmatter 不匹配", async () => {
  const root = tmpRoot()
  try {
    const noSkill = await makeZip({ "a.txt": "x" })
    await assert.rejects(() => uploadSkillZip(root, noSkill), (e: unknown) => e instanceof SkillError && e.status === 400)
    const twoSkills = await makeZip({
      "SKILL.md": "---\nname: s1\n---\n# 1",
      "x/SKILL.md": "---\nname: x\n---\n# 2",
    })
    await assert.rejects(() => uploadSkillZip(root, twoSkills), (e: unknown) => e instanceof SkillError && e.status === 400)
    const mismatch = await makeZip({ "folder/SKILL.md": "---\nname: other\n---\n# m" })
    await assert.rejects(() => uploadSkillZip(root, mismatch), (e: unknown) => e instanceof SkillError && e.status === 400)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("uploadSkillZip：已存在 409 / 超 zip 上限 413", async () => {
  const root = tmpRoot()
  try {
    const buf = await makeZip({ "dup/SKILL.md": "---\nname: dup\n---\n# d" })
    await uploadSkillZip(root, buf)
    await assert.rejects(() => uploadSkillZip(root, buf), (e: unknown) => e instanceof SkillError && e.status === 409)
    const big = Buffer.alloc(MAX_ZIP_BYTES + 1, 0)
    await assert.rejects(() => uploadSkillZip(root, big), (e: unknown) => e instanceof SkillError && e.status === 413)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("isSymlink：识别 unix 符号链接位", () => {
  const sym = { externalFileAttributes: (0o120000 << 16) | 0o100644 } as unknown as Entry
  const reg = { externalFileAttributes: 0o100644 << 16 } as unknown as Entry
  assert.equal(isSymlink(sym), true)
  assert.equal(isSymlink(reg), false)
})
