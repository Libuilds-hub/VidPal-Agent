// runtime/tools/shell-tool.ts —— run_command：在 workspace 内执行终端命令
// 安全：cwd 固定为 workspace（realpath）；环境变量最小化；超时强制终止并尽力清理子进程树；输出截断
import { exec, type ExecException, type ExecOptionsWithStringEncoding } from "child_process"
import fs from "fs"
import path from "path"
import { z } from "zod"
import type { AgentTool } from "./registry"

const MAX_OUTPUT = 8_000

// schema 提升为具名常量：让 execute(args) 获得精确的输出类型（zod default 已生效）
// trim 先于 min(1) 校验：纯空白命令不通过
const shellSchema = z.object({
  command: z.string().trim().min(1),
  timeoutMs: z.number().int().min(100).max(300_000).default(30_000),
})

export function createShellTool(workspace: string): AgentTool<typeof shellSchema> {
  // cwd 用 realpath：跟随符号链接/junction 解析真实路径，保证 cwd 固定为 workspace
  // 的真实路径（与 fs 工具一致的防链接重定向契约）；workspace 不存在时回退词法绝对路径
  let root: string
  try {
    root = fs.realpathSync(workspace)
  } catch {
    root = path.resolve(workspace)
  }

  return {
    name: "run_command",
    description:
      "在项目工作区内执行终端命令（默认超时 30s、上限 300s；cwd 固定为 workspace；stderr 合并进输出；超时后已终止命令，但子进程树清理可能不完整）。会真实执行，仅用于确定需要的场景。",
    inputSchema: shellSchema,
    dangerous: true,
    async execute(args) {
      const output = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = exec(
          args.command,
          {
            cwd: root,
            timeout: args.timeoutMs,
            maxBuffer: 16 * 1024 * 1024,
            windowsHide: true,
            encoding: "utf8",
            // POSIX：detached 使子进程成为独立进程组组长，超时时才能按进程组杀整棵子树。
            // detached 是 spawn 选项，exec 运行时会透传给 spawn，但 @types/node 的
            // ExecOptions 未声明它；断言为 ExecOptionsWithStringEncoding（并显式 utf8
            // 编码）保证回调拿到 string 且绕开对象字面量的多余属性检查。
            detached: process.platform !== "win32",
            env: {
              PATH: process.env.PATH ?? "",
              SystemRoot: process.env.SystemRoot ?? "",
              TEMP: process.env.TEMP ?? "",
              TMP: process.env.TMP ?? "",
              // Next 的 global.d.ts 把 NodeJS.ProcessEnv.NODE_ENV 声明为必填，而本工具
              // 刻意不向子进程注入 NODE_ENV（保持环境变量最小化）；类型断言仅用于绕开
              // 该全局类型合并，运行时不传任何额外变量。
            } as unknown as NodeJS.ProcessEnv,
          } as ExecOptionsWithStringEncoding,
          (err, stdout, stderr) => {
            if (err) {
              const timedOut = (err as ExecException).killed === true
              if (timedOut && child.pid !== undefined) {
                // exec 的 timeout 只杀直接子进程（win32 上是 cmd.exe），派生的孙进程
                // （如 ping.exe、npm 派生的进程）会成孤儿继续运行并占用 cwd；
                // 此处尽力按树清理（best effort，失败不影响主结果）。
                if (process.platform === "win32") {
                  // taskkill /T 递归终止整棵进程树；fire-and-forget
                  exec(`taskkill /PID ${child.pid} /T /F`, { windowsHide: true }, () => {})
                } else {
                  try {
                    process.kill(-child.pid, "SIGTERM") // 负 pid = 整个进程组
                  } catch {
                    // 进程组已退出（ESRCH 等），忽略
                  }
                }
              }
              reject(
                new Error(
                  timedOut
                    ? `命令执行超时（${args.timeoutMs}ms），已终止（子进程树清理可能不完整）`
                    : `命令执行失败（退出码 ${err.code ?? "?"}）: ${(stdout + "\n" + stderr).slice(0, 2000)}`
                )
              )
              return
            }
            resolve({ stdout, stderr })
          }
        )
      })

      const combined = [output.stdout, output.stderr].filter(Boolean).join("\n").trim()
      const truncated = combined.length > MAX_OUTPUT
      return {
        summary: truncated
          ? combined.slice(0, MAX_OUTPUT) + `\n…（输出已截断，共 ${combined.length} 字符）`
          : combined || "（无输出）",
      }
    },
  }
}
