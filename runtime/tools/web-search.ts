// runtime/tools/web-search.ts —— web_search：DuckDuckGo HTML 免费端点（零 Key）
// 解析为纯函数便于测试；网络请求失败时抛出可读错误
import { z } from "zod"
import type { AgentTool } from "./registry"

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

/** 判断 DDG 返回页是否被反爬/限流拦截（纯函数，可单测） */
export function looksLikeAnomaly(html: string): boolean {
  return /anomaly|challenge|captcha|If this problem persists|unusual traffic/i.test(html)
}

/** 从 DuckDuckGo html 端点响应中解析结果（纯函数，可单测） */
export function parseDuckDuckGoHtml(html: string): SearchResult[] {
  const results: SearchResult[] = []
  // 每条结果：result__a（标题+链接）与 result__snippet（摘要）
  // 注意：结果块直接以 </div> 收尾（无内层 div），故捕获到第一个 </div> 即可；
  // 真实页面中 result__a/result__snippet 位于内层 links_main div 内，同样在第一个 </div> 前闭合
  const blockRe = /<div class="result results_links[^"]*">([\s\S]*?)<\/div>/g
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[1]
    const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
    if (!titleMatch) continue
    const rawUrl = titleMatch[1]
    const title = titleMatch[2].replace(/<[^>]+>/g, "").trim()
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : ""
    // 解码 DuckDuckGo 跳转链接中的 uddg 参数；单条解码失败回退原始 URL，不中断整体解析
    const uddg = /[?&]uddg=([^&]+)/.exec(rawUrl)
    let url: string
    if (uddg) {
      try {
        url = decodeURIComponent(uddg[1])
      } catch {
        url = rawUrl
      }
    } else {
      url = rawUrl.replace(/^\/\//, "https://")
    }
    if (title && url.startsWith("http")) {
      results.push({ title, url, snippet })
    }
  }
  return results
}

const webSearchSchema = z.object({
  query: z.string().trim().min(1),
  maxResults: z.number().int().min(1).max(10).default(5),
})

export function createWebSearchTool(): AgentTool<typeof webSearchSchema> {
  return {
    name: "web_search",
    description: "在互联网上搜索网页（免费 DuckDuckGo 搜索）。返回标题/链接/摘要列表。",
    inputSchema: webSearchSchema,
    dangerous: false,
    async execute(args) {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`搜索失败: HTTP ${res.status}（DuckDuckGo 限流或服务异常，请稍后重试）`)
        }
        throw new Error(`搜索失败: HTTP ${res.status}`)
      }
      const html = await res.text()
      if (looksLikeAnomaly(html)) {
        throw new Error("DuckDuckGo 限流或反爬拦截，请稍后重试或更换查询词")
      }
      const results = parseDuckDuckGoHtml(html).slice(0, args.maxResults)
      if (results.length === 0) return { summary: "（没有搜索结果）" }
      return {
        summary: results
          .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
          .join("\n"),
      }
    },
  }
}
