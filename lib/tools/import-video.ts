// lib/tools/import-video.ts
import { DynamicTool } from "@langchain/core/tools"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const importVideoTool = new DynamicTool({
  name: "importVideo",
  description:
    "导入视频链接，触发后台下载、转写、摘要和导图生成。导入在后台异步进行，不阻塞对话。" +
    "参数: urls(必填，视频链接数组)。导入前应该先让用户确认要导入哪些视频。",
  func: async (input: string) => {
    let urls: string[]
    try { urls = (JSON.parse(input) as { urls: string[] }).urls } catch { return JSON.stringify({ error: "参数解析失败，请提供有效的视频链接数组" }) }
    const results: Array<{ url: string; videoId?: string; title?: string; error?: string }> = []

    for (const url of urls) {
      try {
        const res = await fetch(`${APP_URL}/api/video/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        const data = await res.json()
        if (!res.ok) {
          results.push({ url, error: data.error || "导入失败" })
        } else {
          results.push({ url, videoId: data.id, title: data.title || "处理中..." })
        }
      } catch (e) {
        results.push({ url, error: e instanceof Error ? e.message : "网络错误" })
      }
    }

    const succeeded = results.filter((r) => !("error" in r))
    const failed = results.filter((r) => "error" in r)
    return JSON.stringify({
      imported: succeeded.map((r) => r.url),
      failed: failed.map((r) => ({ url: r.url, error: r.error })),
      message:
        `已开始导入 ${succeeded.length} 个视频。` +
        "后台处理中（下载→转码→转写→摘要→导图），大约需要 3-8 分钟。" +
        "完成后可通过 getVideoContext 查询状态。",
    })
  },
})
