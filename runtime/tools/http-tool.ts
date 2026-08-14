// runtime/tools/http-tool.ts —— http_get：受限 HTTP 请求（仅 http/https、超时、大小上限、SSRF 防护）
import { z } from "zod"
import type { AgentTool } from "./registry"

const MAX_BODY = 200_000

/** 私网/回环地址判断（SSRF 防护用，纯函数可单测） */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "") // 去 IPv6 括号
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true
  if (h.startsWith("127.") || h.startsWith("10.") || h.startsWith("192.168.") || h.startsWith("169.254.")) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  return false
}

// 已知边界：本层不做 DNS rebinding 防护，也不覆盖完整私网网段
// （如 IPv6 ULA fc00::/7、IPv4-mapped IPv6、组播等），需在后续网络层加固

/** 流式限读响应体：最多读 cap 字节，超出即取消，避免无界 body 打爆内存 */
async function readBodyCapped(res: Response, cap: number): Promise<{ text: string; truncated: boolean; total: number }> {
  if (!res.body) return { text: "", truncated: false, total: 0 }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  let truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > cap) {
      truncated = true
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  return { text: Buffer.concat(chunks).toString("utf-8"), truncated, total }
}

const httpGetSchema = z.object({
  url: z.string().min(1),
  allowPrivate: z.boolean().default(false),
})

export function createHttpTool(): AgentTool<typeof httpGetSchema> {
  return {
    name: "http_get",
    description: "发送 HTTP GET 请求获取网页/API 内容（仅 http/https，内容超过 200KB 截断；默认拒绝内网/回环地址）",
    inputSchema: httpGetSchema,
    dangerous: false,
    async execute(args) {
      if (!/^https?:\/\//i.test(args.url)) throw new Error(`仅支持 http/https: ${args.url}`)
      const u = new URL(args.url)
      if (!args.allowPrivate && isPrivateHost(u.hostname)) {
        throw new Error("拒绝访问内网/回环地址（如需要访问本地服务，请显式设置 allowPrivate: true）")
      }
      const res = await fetch(args.url, {
        signal: AbortSignal.timeout(15_000),
        redirect: "follow",
      })
      // 跟随重定向后校验最终 URL（DNS rebinding 不在本层覆盖，见 isPrivateHost 注释）
      if (!args.allowPrivate && isPrivateHost(new URL(res.url).hostname)) {
        throw new Error("重定向到内网/回环地址，已拒绝")
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { text, truncated, total } = await readBodyCapped(res, MAX_BODY)
      return {
        summary: truncated
          ? text + `\n…（已截断，共 ${total}+ 字节）`
          : text,
      }
    },
  }
}
