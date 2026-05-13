import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { transcribeAudio, extractAudio } from "@/lib/whisper"
import path from "path"
import fs from "fs"
import { existsSync } from "fs"

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos")
const AUDIO_DIR = path.join(process.cwd(), "public", "audio")

function ensureAudioDir(): void {
  if (!existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
    }

    // 获取视频信息
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (!video.localPath) {
      return NextResponse.json({ error: "Video not downloaded yet" }, { status: 400 })
    }

    const videoPath = path.join(process.cwd(), "public", video.localPath)
    if (!existsSync(videoPath)) {
      return NextResponse.json({ error: "Video file not found" }, { status: 404 })
    }

    // 更新状态为转录中
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "transcribing" },
    })

    // 确保音频目录存在
    ensureAudioDir()

    // 提取音频
    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
    console.log("Extracting audio from:", videoPath)
    await extractAudio(videoPath, audioPath)

    // 转录
    console.log("Transcribing audio...")
    const transcripts = await transcribeAudio(audioPath, "base", "zh")

    // 删除临时音频文件
    if (existsSync(audioPath)) {
      fs.unlinkSync(audioPath)
    }

    // 更新视频状态并保存转录结果
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "done",
        transcripts: JSON.stringify(transcripts),
      },
    })

    return NextResponse.json({
      videoId,
      transcripts,
    })

  } catch (error) {
    console.error("Transcription error:", error)

    // 如果有 videoId，更新状态为错误
    try {
      const { videoId } = await request.json().catch(() => ({}))
      if (videoId) {
        await prisma.video.update({
          where: { id: videoId },
          data: { status: "error", error: "Transcription failed" },
        })
      }
    } catch {}

    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    )
  }
}