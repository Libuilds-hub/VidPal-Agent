// runtime/agent/tools/import-video.ts —— 导入视频（直接入队 Runtime，非 HTTP 回环）
import { z } from "zod"
import type { AgentTool } from "../../tools/registry"

const importVideoSchema = z.object({ urls: z.array(z.string().min(1)).min(1).max(10) })

export interface EnqueueInput {
  type: string
  input?: unknown
  idempotencyKey?: string
}

export function createImportVideoTool(opts: {
  enqueue: (input: EnqueueInput) => { taskId: string }
}): AgentTool<typeof importVideoSchema> {
  const { enqueue } = opts
  return {
    name: "import_video",
    description:
      "导入视频链接，触发后台下载、转写、摘要和导图生成。导入在后台异步进行，不阻塞对话。" +
      "参数: urls(必填，视频链接数组)。导入前应该先让用户确认要导入哪些视频。",
    inputSchema: importVideoSchema,
    dangerous: false,
    async execute(args) {
      const results: Array<{ url: string; taskId?: string; error?: string }> = []
      for (const url of args.urls) {
        try {
          let source = "bilibili"
          if (url.includes("youtube.com") || url.includes("youtu.be")) source = "youtube"
          const r = enqueue({ type: "import_video", input: { url, source }, idempotencyKey: `video:${url}` })
          results.push({ url, taskId: r.taskId })
        } catch (e) {
          results.push({ url, error: e instanceof Error ? e.message : "入队失败" })
        }
      }
      const succeeded = results.filter((r) => !("error" in r))
      const failed = results.filter((r) => "error" in r)
      return {
        summary: JSON.stringify({
          imported: succeeded.map((r) => r.url),
          failed: failed.map((r) => ({ url: r.url, error: r.error })),
          message:
            `已开始导入 ${succeeded.length} 个视频。` +
            "后台处理中（下载→转码→转写→摘要→导图），大约需要 3-8 分钟。" +
            "完成后可通过 get_video_context 查询状态。",
        }),
      }
    },
  }
}
