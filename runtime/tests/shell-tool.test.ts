// runtime/tests/shell-tool.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import os from "os"
import path from "path"
import { createShellTool } from "../tools/shell-tool"

/**
 * 删除工作区目录。Windows 下 exec 超时只终止直接的 cmd.exe，其派生的
 * ping.exe 等会成为孤儿进程并继续占用 cwd 约 1~3 秒，期间 rmSync 报 EPERM；
 * 轮询重试等待孤儿自然退出（ping -n 2 约 1 秒）。POSIX 首试即成功。
 */
async function rmWorkspace(ws: string) {
  const deadline = Date.now() + 5_000
  for (;;) {
    try {
      fs.rmSync(ws, { recursive: true, force: true })
      return
    } catch {
      if (Date.now() > deadline) throw new Error(`清理工作区失败: ${ws}`)
      await new Promise((r) => setTimeout(r, 100))
    }
  }
}

test("run_command：在 workspace 内执行并返回输出；dangerous=true", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "rt-sh-"))
  try {
    const tool = createShellTool(ws)
    assert.equal(tool.dangerous, true)

    const r = await tool.execute({ command: "echo hello", timeoutMs: 5000 })
    assert.match(r.summary, /hello/)
  } finally {
    await rmWorkspace(ws)
  }
})

test("run_command：cwd 固定为 workspace；超时被终止", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "rt-sh-"))
  try {
    const tool = createShellTool(ws)
    // 超时：命令需运行约 1 秒但只给 300ms（ping -n 2 比 -n 4 更快退出，缩短清理等待）
    const cmd = process.platform === "win32" ? "ping -n 2 127.0.0.1 >nul" : "sleep 3"
    await assert.rejects(
      () => tool.execute({ command: cmd, timeoutMs: 300 }),
      /超时|终止/
    )
  } finally {
    await rmWorkspace(ws)
  }
})
