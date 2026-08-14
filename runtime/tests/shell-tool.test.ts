// runtime/tests/shell-tool.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import os from "os"
import path from "path"
import { createShellTool } from "../tools/shell-tool"

/**
 * 删除工作区目录。超时路径已做子进程树清理（win32 taskkill /T，POSIX 进程组），
 * 但清理是 best effort，残留进程仍可能在极短窗口内占用 cwd 导致 rmSync 报 EPERM；
 * 轮询重试兜底，等待进程句柄释放。POSIX 首试即成功。
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

test("run_command：cwd 固定为 workspace 的 realpath", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "rt-sh-"))
  try {
    const tool = createShellTool(ws)
    const cmd = process.platform === "win32" ? "cmd /c cd" : "pwd"
    const r = await tool.execute({ command: cmd, timeoutMs: 5000 })
    // win32 下临时目录的 realpath 可能大小写/短路径不同：用小写 includes 比较
    const real = fs.realpathSync(ws)
    assert.ok(
      r.summary.toLowerCase().includes(real.toLowerCase()),
      `summary 应包含 cwd（${real}），实际: ${r.summary}`
    )
  } finally {
    await rmWorkspace(ws)
  }
})

test("run_command：环境变量最小化（不注入宿主环境）", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "rt-sh-"))
  process.env.SENTINEL_RT = "should-not-leak"
  try {
    const tool = createShellTool(ws)
    const cmd =
      process.platform === "win32" ? "echo %SENTINEL_RT%" : "echo $SENTINEL_RT"
    const r = await tool.execute({ command: cmd, timeoutMs: 5000 })
    assert.ok(
      !r.summary.includes("should-not-leak"),
      `summary 不应泄漏 SENTINEL_RT，实际: ${r.summary}`
    )
  } finally {
    delete process.env.SENTINEL_RT
    await rmWorkspace(ws)
  }
})

test("run_command：输出超过 8000 字符被截断并标记", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "rt-sh-"))
  try {
    const tool = createShellTool(ws)
    const cmd =
      process.platform === "win32"
        ? `powershell -NoProfile -Command "'x' * 9000"`
        : `python3 -c "print('x'*9000)"`
    const r = await tool.execute({ command: cmd, timeoutMs: 15000 })
    assert.ok(r.summary.includes("已截断"), `summary 应标记截断，实际: ${r.summary.slice(0, 120)}`)
  } finally {
    await rmWorkspace(ws)
  }
})

test("run_command：空输出返回占位符", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "rt-sh-"))
  try {
    const tool = createShellTool(ws)
    // win32 下 cmd /c exit 0 不产生任何输出（含换行）
    const cmd = process.platform === "win32" ? "cmd /c exit 0" : "true"
    const r = await tool.execute({ command: cmd, timeoutMs: 5000 })
    assert.equal(r.summary, "（无输出）")
  } finally {
    await rmWorkspace(ws)
  }
})
