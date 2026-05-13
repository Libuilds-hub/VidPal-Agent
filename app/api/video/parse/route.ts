import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getVideoInfo, downloadVideo } from "@/lib/yt-dlp"

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
    return NextResponse.json({ error: "Failed to parse video" }, { status: 500 })
  }
}

async function downloadVideoAsync(videoId: string, url: string) {
  try {
    // 获取视频信息
    const info = await getVideoInfo(url)

    // 更新视频信息
    await prisma.video.update({
      where: { id: videoId },
      data: {
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
      },
    })

    // 下载视频（自动转码为 H.264）
    const localPath = await downloadVideo(url, videoId)

    // 更新为下载完成，开始转录
    await prisma.video.update({
      where: { id: videoId },
      data: {
        localPath,
        status: "transcribing",
      },
    })

    // 异步转录（不等待完成）
    transcribeAsync(videoId, localPath)

  } catch (error) {
    console.error("Download error:", error)
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "error",
        error: error instanceof Error ? error.message : "Download failed",
      },
    })
  }
}

async function transcribeAsync(videoId: string, localPath: string) {
  try {
    const { extractAudio, transcribeAudio } = await import("@/lib/whisper")
    const path = await import("path")
    const fs = await import("fs")

    const videoPath = path.join(process.cwd(), "public", localPath)
    const audioDir = path.join(process.cwd(), "public", "audio")

    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true })
    }

    const audioPath = path.join(audioDir, `${videoId}.mp3`)

    // 提取音频
    await extractAudio(videoPath, audioPath)

    // 转录
    const transcripts = await transcribeAudio(audioPath, "base", "zh")

    // 删除临时音频
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath)
    }

    // 更新为完成，保存转录结果
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "done",
        transcripts: JSON.stringify(transcripts),
      },
    })

    console.log("Transcription complete for video:", videoId)

  } catch (error) {
    console.error("Transcription error:", error)
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "error",
        error: "Transcription failed",
      },
    })
  }
}
