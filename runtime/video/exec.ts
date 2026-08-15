// runtime/video/exec.ts —— 支持 AbortSignal 的 exec 封装（取消任务时终止子进程）
//
// 已知限制（Windows）：命令经 cmd.exe 启动，Node 的 signal abort 只终止直接子进程
// cmd.exe，孙进程（yt-dlp / ffmpeg / ping）会成孤儿继续写文件。下面的 taskkill /T 是
// 尽力而为的进程树清理：与 abort 存在竞态，个别孙进程可能短暂存活后自退（如 ping -n 3
// 最多 ~2s），无法 100% 保证同步终止——但能覆盖绝大多数取消场景，且不会留下永久孤儿。
import { exec, type ExecOptions } from "child_process"

export function execWithSignal(
  command: string,
  signal: AbortSignal | undefined,
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // { ...options, signal }：abort 时 Node 直接杀 cmd.exe（SignalCode 终止），
    // 下面的 onAbort 再补 taskkill /T 清掉整棵进程树
    const child = exec(command, { ...options, signal }, (err, stdout, stderr) => {
      if (err) {
        if (signal?.aborted) {
          reject(new Error("任务已取消"))
        } else {
          reject(err)
        }
        return
      }
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() })
    })
    // 中止时尽力清理进程树（Windows: cmd.exe 被杀后子进程成孤儿，需 taskkill /T）
    if (signal && child.pid) {
      const pid = child.pid
      const onAbort = () => {
        if (process.platform === "win32") {
          exec(`taskkill /PID ${pid} /T /F`, { windowsHide: true }, () => {})
        } else {
          try {
            process.kill(-pid, "SIGTERM")
          } catch {
            /* ESRCH 等：进程已退出 */
          }
        }
      }
      if (signal.aborted) onAbort()
      else signal.addEventListener("abort", onAbort, { once: true })
    }
    void child
  })
}
