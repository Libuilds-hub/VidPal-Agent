// runtime/tests/fs-tools.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import os from "os"
import path from "path"
import { createFsTools } from "../tools/fs-tools"

function makeWorkspace() {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "rt-fs-"))
  fs.writeFileSync(path.join(ws, "a.txt"), "hello")
  fs.mkdirSync(path.join(ws, "sub"))
  fs.writeFileSync(path.join(ws, "sub", "b.txt"), "world")
  return ws
}

test("read_file / list_dir 在白名单内工作", async () => {
  const ws = makeWorkspace()
  try {
    const tools = createFsTools(ws)
    const read = tools.find((t) => t.name === "read_file")!
    const list = tools.find((t) => t.name === "list_dir")!

    const r = await read.execute({ path: "a.txt" })
    assert.equal(r.summary, "hello")

    const l = await list.execute({ path: "." })
    assert.match(l.summary, /a\.txt/)
    assert.match(l.summary, /sub/)

    // 相对路径与绝对路径都接受
    const r2 = await read.execute({ path: path.join(ws, "sub", "b.txt") })
    assert.equal(r2.summary, "world")
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
  }
})

test("白名单外路径被拒绝（路径穿越）", async () => {
  const ws = makeWorkspace()
  try {
    const tools = createFsTools(ws)
    const read = tools.find((t) => t.name === "read_file")!

    await assert.rejects(() => read.execute({ path: "../secret.txt" }), /白名单外/)
    await assert.rejects(() => read.execute({ path: "C:\\Windows\\win.ini" }), /白名单外/)
    await assert.rejects(() => read.execute({ path: path.join(ws, "..", "..") }), /白名单外/)
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
  }
})

test("write_file 创建/覆盖，dangerous=true；目录内相对路径", async () => {
  const ws = makeWorkspace()
  try {
    const tools = createFsTools(ws)
    const write = tools.find((t) => t.name === "write_file")!
    assert.equal(write.dangerous, true)

    await write.execute({ path: "sub/c.txt", content: "new" })
    assert.equal(fs.readFileSync(path.join(ws, "sub", "c.txt"), "utf-8"), "new")

    await assert.rejects(() => write.execute({ path: "../evil.txt", content: "x" }), /白名单外/)
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
  }
})

test("write_file 自动创建深层新目录（父目录链不存在）", async () => {
  const ws = makeWorkspace()
  try {
    const tools = createFsTools(ws)
    const write = tools.find((t) => t.name === "write_file")!
    // ws 中不存在 deep/ 目录，write_file 应自动创建整条父目录链
    await write.execute({ path: "deep/nested/new.txt", content: "x" })
    assert.equal(fs.readFileSync(path.join(ws, "deep", "nested", "new.txt"), "utf-8"), "x")
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
  }
})

test("junction/symlink 指向外部目录被拒（逃逸）", async (t) => {
  const ws = makeWorkspace()
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "rt-fs-out-"))
  try {
    fs.writeFileSync(path.join(outside, "secret.txt"), "top-secret")
    // Windows junction 无需管理员权限；非 Windows 用目录符号链接
    const linkType = process.platform === "win32" ? "junction" : "dir"
    try {
      fs.symlinkSync(outside, path.join(ws, "link"), linkType)
    } catch (err) {
      t.skip(`无法创建 ${linkType} 链接: ${(err as Error).message}`)
      return
    }
    const tools = createFsTools(ws)
    const read = tools.find((x) => x.name === "read_file")!
    const write = tools.find((x) => x.name === "write_file")!

    // 经链接读外部文件必须被拒
    await assert.rejects(() => read.execute({ path: "link/secret.txt" }), /白名单外/)
    // 经链接写新文件 / 覆盖外部已有文件都必须被拒
    await assert.rejects(() => write.execute({ path: "link/new.txt", content: "x" }), /白名单外/)
    await assert.rejects(() => write.execute({ path: "link/secret.txt", content: "evil" }), /白名单外/)
    // 外部真实文件未被改动
    assert.equal(fs.readFileSync(path.join(outside, "secret.txt"), "utf-8"), "top-secret")
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
    fs.rmSync(outside, { recursive: true, force: true })
  }
})

test("junction 指向外部时，深层新文件写入被拒（最近存在祖先解析逃逸）", async (t) => {
  const ws = makeWorkspace()
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "rt-fs-out2-"))
  try {
    const linkType = process.platform === "win32" ? "junction" : "dir"
    try {
      fs.symlinkSync(outside, path.join(ws, "linkdir"), linkType)
    } catch (err) {
      t.skip(`无法创建 ${linkType} 链接: ${(err as Error).message}`)
      return
    }
    const tools = createFsTools(ws)
    const write = tools.find((x) => x.name === "write_file")!
    // 父目录链中最近存在的是 junction linkdir（nested 不存在），解析后位于白名单外
    await assert.rejects(() => write.execute({ path: "linkdir/nested/new.txt", content: "x" }), /白名单外/)
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
    fs.rmSync(outside, { recursive: true, force: true })
  }
})

test("read_file 长文件截断（10000 字符）", async () => {
  const ws = makeWorkspace()
  try {
    fs.writeFileSync(path.join(ws, "long.txt"), "x".repeat(15000))
    const tools = createFsTools(ws)
    const read = tools.find((x) => x.name === "read_file")!
    const r = await read.execute({ path: "long.txt" })
    assert.match(r.summary, /已截断/)
    assert.ok(r.summary.length < 15000)
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
  }
})

test("read_file 拒绝大于 10MB 的文件（防 OOM）", async () => {
  const ws = makeWorkspace()
  try {
    fs.writeFileSync(path.join(ws, "big.bin"), Buffer.alloc(11 * 1024 * 1024, 0x61))
    const tools = createFsTools(ws)
    const read = tools.find((x) => x.name === "read_file")!
    await assert.rejects(() => read.execute({ path: "big.bin" }), /文件过大/)
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
  }
})

const caseInsensitiveTest = process.platform === "win32" ? test : test.skip
caseInsensitiveTest("Windows 路径大小写不敏感（大写工作区路径可读）", async () => {
  const ws = makeWorkspace()
  try {
    const tools = createFsTools(ws)
    const read = tools.find((x) => x.name === "read_file")!
    const r = await read.execute({ path: path.join(ws.toUpperCase(), "a.txt") })
    assert.equal(r.summary, "hello")
  } finally {
    fs.rmSync(ws, { recursive: true, force: true })
  }
})
