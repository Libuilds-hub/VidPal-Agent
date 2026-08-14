import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { downloadVideoAsync, generateSummary, generateMindmap } from "@/lib/video-pipeline"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // 检测视频源
    let source: string
    if (url.includes("bilibili.com")) {
      source = "bilibili"
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      source = "youtube"
    } else {
      return NextResponse.json({ error: "Unsupported video source" }, { status: 400 })
    }

    // 创建视频记录
    const video = await prisma.video.create({
      data: {
        source,
        url,
        status: "downloading",
      },
    })

    // 异步下载视频（不等待完成）
    downloadVideoAsync(video.id, url)

    return NextResponse.json({
      id: video.id,
      title: video.title,
      source: video.source,
      url: video.url,
      status: video.status,
    })
  } catch (error) {
    console.error("Parse video error:", error)
    const message = error instanceof Error ? error.message : "Failed to parse video"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT — re-run LLM generation (correction + summary + mindmap) for a video
 * that already has transcripts stored. No re-download, no re-transcription.
 */
export async function PUT(request: NextRequest) {
  try {
    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 })
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true, transcripts: true, status: true },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (!video.transcripts) {
      return NextResponse.json({ error: "No transcripts found. Transcribe first." }, { status: 400 })
    }

    let transcripts: { start: string; startTime: number; text: string }[]
    try {
      transcripts = JSON.parse(video.transcripts)
    } catch {
      return NextResponse.json({ error: "Transcripts are corrupted" }, { status: 400 })
    }

    // Update status to show we're working
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "transcribing" },
    })

    // Re-run all LLM steps (skip correction — MiniMax think mode exhausts tokens)
    const summary = await generateSummary(transcripts)
    const mindmap = await generateMindmap(transcripts, video.title)

    const summaryOk = summary.overview && summary.overview.length > 0
    const mindmapOk = mindmap != null

    if (!summaryOk && !mindmapOk) {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: "error",
          error: "LLM generation failed: both summary and mindmap are empty. Check API key and model settings.",
          transcripts: JSON.stringify(transcripts),
        },
      })
      return NextResponse.json({
        success: false,
        error: "Both summary and mindmap generation failed",
        details: { summaryOk, mindmapOk },
      })
    }

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "done",
        transcripts: JSON.stringify(transcripts),
        summary: JSON.stringify(summary),
        mindmap,
      },
    })

    return NextResponse.json({
      success: true,
      summaryOk,
      mindmapOk,
    })
  } catch (error) {
    console.error("PUT parse error:", error)
    try {
      const { videoId } = await request.json().catch(() => ({}))
      if (videoId) {
        await prisma.video.update({
          where: { id: videoId },
          data: { status: "error", error: "LLM retry failed" },
        })
      }
    } catch {}
    return NextResponse.json({ error: "Retry failed" }, { status: 500 })
  }
}
