// runtime/tools/http-tool.ts —— http_get：受限 HTTP 请求（仅 http/https、超时、大小上限）
import { z } from "zod"
import type { AgentTool, ToolResult } from "./registry"

const MAX_BODY = 200_000

const httpGetSchema = z.object({ url: z.string().min(1) })

export function createHttpTool(): AgentTool<typeof httpGetSchema> {
  return {
    name: "http_get",
    description: "发送 HTTP GET 请求获取网页/API 内容（仅 http/https，内容超过 200KB 截断）",
    inputSchema: httpGetSchema,
    dangerous: false,
    async execute(args) {
      if (!/^https?:\/\//.test(args.url)) throw new Error(`仅支持 http/https: ${args.url}`)
      const res = await fetch(args.url, {
        signal: AbortSignal.timeout(15_000),
        redirect: "follow",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const truncated = text.length > MAX_BODY
      return {
        summary: truncated
          ? text.slice(0, MAX_BODY) + `\n…（已截断，共 ${text.length} 字符）`
          : text.slice(0, MAX_BODY),
      }
    },
  }
}
