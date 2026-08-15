// runtime/agent/tools/get-video-context.ts —— 视频摘要/要点查询
import { z } from "zod"
import { prisma } from "../../../lib/db"
import type { AgentTool } from "../../tools/registry"

const getVideoContextSchema = z.object({ videoId: z.string().min(1) })

export function createGetVideoContextTool(): AgentTool<typeof getVideoContextSchema> {
  return {
    name: "get_video_context",
    description:
      "获取某个已导入视频的内容摘要和结构。当用户问'这个视频讲了什么'或'视频中有哪些要点'时使用。" +
      "参数: videoId(必填)",
    inputSchema: getVideoContextSchema,
    dangerous: false,
    async execute(args) {
      const video = await prisma.video.findUnique({ where: { id: args.videoId } })
      if (!video) return { summary: JSON.stringify({ error: "视频未找到，请检查 videoId" }) }

      let summary: { overview?: string; keyPoints?: string[]; segments?: { time: string; title: string }[] } | null = null
      if (video.summary) {
        try { summary = JSON.parse(video.summary) } catch { /* corrupted JSON */ }
      }

      return {
        summary: JSON.stringify({
          title: video.title || "未命名",
          source: video.source,
          duration: video.duration,
          status: video.status,
          overview: summary?.overview || null,
          keyPoints: summary?.keyPoints || [],
          segments: (summary?.segments || []).map((s: { time: string; title: string }) => ({
            time: s.time,
            title: s.title,
          })),
          hasTranscript: !!video.transcripts,
          hasMindmap: !!video.mindmap,
        }),
      }
    },
  }
}
