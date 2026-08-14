// runtime/tools/shell-tool.ts —— run_command：在 workspace 内执行终端命令
// 安全：cwd 固定为 workspace；环境变量最小化；超时强制终止；输出截断
import { exec, type ExecException } from "child_process"
import path from "path"
import { z } from "zod"
import type { AgentTool, ToolResult } from "./registry"

const MAX_OUTPUT = 8_000

// schema 提升为具名常量：让 execute(args) 获得精确的输出类型（zod default 已生效）
const shellSchema = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().int().min(100).max(300_000).default(30_000),
})

export function createShellTool(workspace: string): AgentTool<typeof shellSchema> {
  const root = path.resolve(workspace)

  return {
    name: "run_command",
    description: "在项目工作区内执行终端命令。会真实执行，仅用于确定需要的场景。",
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
            env: {
              PATH: process.env.PATH ?? "",
              SystemRoot: process.env.SystemRoot ?? "",
              TEMP: process.env.TEMP ?? "",
              TMP: process.env.TMP ?? "",
              // Next 的 global.d.ts 把 NodeJS.ProcessEnv.NODE_ENV 声明为必填，而本工具
              // 刻意不向子进程注入 NODE_ENV（保持环境变量最小化）；类型断言仅用于绕开
              // 该全局类型合并，运行时不传任何额外变量。
            } as unknown as NodeJS.ProcessEnv,
          },
          (err, stdout, stderr) => {
            if (err) {
              const timedOut = (err as ExecException).killed === true
              reject(
                new Error(
                  timedOut
                    ? `命令执行超时（${args.timeoutMs}ms），已终止`
                    : `命令执行失败: ${err.message}\n${stderr.slice(0, 2000)}`
                )
              )
              return
            }
            resolve({ stdout, stderr })
          }
        )
        void child
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
