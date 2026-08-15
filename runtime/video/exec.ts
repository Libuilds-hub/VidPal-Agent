// runtime/video/exec.ts —— 支持 AbortSignal 的 exec 封装（取消任务时终止子进程）
import { exec, type ExecOptions } from "child_process"

export function execWithSignal(
  command: string,
  signal: AbortSignal | undefined,
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
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
    void child
  })
}
