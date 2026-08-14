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
