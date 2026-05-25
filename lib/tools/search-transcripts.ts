// lib/tools/search-transcripts.ts
import { DynamicTool } from "@langchain/core/tools"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"
import { Document } from "@langchain/core/documents"
import { getEmbeddings } from "@/lib/llm"
import { prisma } from "@/lib/db"

let _store: MemoryVectorStore | null = null
let _videoIdsIndexed = new Set<string>()

interface TranscriptSegment {
  start: string
  startTime: number
  end?: string
  text: string
}

async function getVectorStore(): Promise<MemoryVectorStore> {
  if (_store) return _store

  const embeddings = await getEmbeddings()
  const videos = await prisma.video.findMany({ where: { status: "done" } })
  const docs: Document[] = []

  for (const video of videos) {
    if (!video.transcripts) continue
    _videoIdsIndexed.add(video.id)
    try {
      const segments: TranscriptSegment[] = JSON.parse(video.transcripts)
      for (const seg of segments) {
        docs.push(new Document({
          pageContent: `[${video.title || "未命名"}] ${seg.text}`,
          metadata: {
            videoId: video.id,
            videoTitle: video.title || "未命名",
            startTime: seg.start,
            startTimeSeconds: seg.startTime,
          },
        }))
      }
    } catch { /* corrupted transcripts — skip */ }
  }

  _store = await MemoryVectorStore.fromDocuments(docs, embeddings)
  return _store
}

export async function addVideoToIndex(videoId: string): Promise<void> {
  if (!_store || _videoIdsIndexed.has(videoId)) return
  const video = await prisma.video.findUnique({ where: { id: videoId } })
  if (!video?.transcripts) return
  try {
    const segments: TranscriptSegment[] = JSON.parse(video.transcripts)
    const docs = segments.map((seg) =>
      new Document({
        pageContent: `[${video.title || "未命名"}] ${seg.text}`,
        metadata: {
          videoId: video.id,
          videoTitle: video.title || "未命名",
          startTime: seg.start,
          startTimeSeconds: seg.startTime,
        },
      })
    )
    await _store.addDocuments(docs)
    _videoIdsIndexed.add(videoId)
  } catch { /* skip */ }
}

export const searchTranscriptsTool = new DynamicTool({
  name: "searchTranscripts",
  description:
    "语义搜索已导入视频的转写内容。当用户问视频中提到了什么概念或想跨视频查找某个主题时使用。" +
    "参数: query(必填,搜索查询), videoId(选填,指定只在该视频内搜索)",
  func: async (input: string) => {
    let query: string, videoId: string | undefined
    try {
      const parsed = JSON.parse(input)
      query = parsed.query
      videoId = parsed.videoId
    } catch {
      query = String(input).slice(0, 200)
    }
    const store = await getVectorStore()
    let results = await store.similaritySearchWithScore(query, 5)

    if (videoId) {
      results = results.filter(([doc]) => doc.metadata.videoId === videoId)
    }

    return JSON.stringify(
      results.map(([doc, score]) => ({
        videoId: doc.metadata.videoId,
        videoTitle: doc.metadata.videoTitle,
        startTime: doc.metadata.startTime,
        text: doc.pageContent,
        score: Math.round(score * 100) / 100,
      }))
    )
  },
})
