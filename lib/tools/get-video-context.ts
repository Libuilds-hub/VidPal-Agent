// lib/tools/get-video-context.ts
import { DynamicTool } from "@langchain/core/tools"
import { prisma } from "@/lib/db"

export const getVideoContextTool = new DynamicTool({
  name: "getVideoContext",
  description:
    "获取某个已导入视频的内容摘要和结构。当用户问'这个视频讲了什么'或'视频中有哪些要点'时使用。" +
    "参数: videoId(必填)",
  func: async (input: string) => {
    const { videoId } = JSON.parse(input)
    const video = await prisma.video.findUnique({ where: { id: videoId } })
    if (!video) return JSON.stringify({ error: "视频未找到，请检查 videoId" })

    let summary: { overview?: string; keyPoints?: string[]; segments?: { time: string; title: string }[] } | null = null
    if (video.summary) {
      try { summary = JSON.parse(video.summary) } catch { /* corrupted JSON */ }
    }

    return JSON.stringify({
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
    })
  },
})
