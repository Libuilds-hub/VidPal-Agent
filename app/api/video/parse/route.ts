import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getVideoInfo, downloadVideo, downloadThumbnail } from "@/lib/yt-dlp"

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

async function downloadVideoAsync(videoId: string, url: string) {
  try {
    // 获取视频信息
    const info = await getVideoInfo(url)

    // 下载封面到本地
    const localThumbnail = info.thumbnail ? await downloadThumbnail(info.thumbnail, videoId) : null

    // 更新视频信息
    await prisma.video.update({
      where: { id: videoId },
      data: {
        title: info.title,
        duration: info.duration,
        thumbnail: localThumbnail,
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

    // 视频路径：/videos/{videoId}/video.mp4
    const videoDir = path.join(process.cwd(), "public", "videos", videoId)
    const audioPath = path.join(videoDir, "audio.mp3")

    // 提取音频到视频目录
    const videoPath = path.join(videoDir, "video.mp4")
    await extractAudio(videoPath, audioPath)

    // 转录
    const transcripts = await transcribeAudio(audioPath, "base", "zh")

    // 生成摘要
    const summary = await generateSummary(transcripts)

    // 更新为完成，保存转录结果和摘要
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "done",
        transcripts: JSON.stringify(transcripts),
        summary: JSON.stringify(summary),
      },
    })

    console.log("Transcription and summary complete for video:", videoId)

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

interface SummaryResult {
  overview: string
  keyPoints: string[]
  segments: { time: string; title: string; content: string }[]
}

async function generateSummary(transcripts: { start: string; startTime: number; text: string }[]): Promise<SummaryResult> {
  // 读取 LLM 设置
  const settings = await prisma.setting.findMany()
  const settingMap: Record<string, string> = {}
  settings.forEach((s) => { settingMap[s.key] = s.value })

  const provider = settingMap.llmProvider || "minimax"
  const apiKey = settingMap.llmApiKey
  const model = settingMap.llmModel || (provider === "deepseek" ? "deepseek-v4-flash" : "MiniMax-M2.7")

  if (!apiKey) {
    console.warn("LLM API key not configured, skipping summary generation")
    return { overview: "", keyPoints: [], segments: [] }
  }

  const baseUrl = provider === "deepseek"
    ? "https://api.deepseek.com"
    : "https://api.minimaxi.com/v1"

  // 构建字幕文本
  const transcriptText = transcripts
    .map((t) => `[${t.start}] ${t.text}`)
    .join("\n")

  const prompt = `你是一个视频内容分析助手。根据以下视频字幕，生成结构化摘要：

字幕内容：
${transcriptText}

请以 JSON 格式输出，包含以下字段：
- overview: 全文概述（100-200字）
- keyPoints: 关键要点数组（3-5条，每条不超过50字）
- segments: 分段总结数组，每段包含 time（时间点）、title（段落标题，不超过20字）、content（内容摘要，不超过100字）

只输出 JSON，不要有其他内容。`

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `LLM API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("LLM returned empty response")
    }

    // 解析 JSON（去除 markdown 代码块和 thinking tags）
    const jsonStr = content
      .replace(/^```json\n?/, "")
      .replace(/\n?```$/, "")
      .replace(/^[ \t]*[ \t]*$/gm, "")
      .replace(/^[ \t]*<think>[ \t]*$/gm, "")
      .trim()

    // 提取 JSON 对象（处理可能的前后杂文本）
    // 使用非贪婪匹配避免贪心匹配到JSON之后的内容
    const jsonMatch = jsonStr.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }
    // 再次验证：确保匹配的内容是有效JSON（检查是否被截断）
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      // 如果非贪婪匹配失败，尝试找最后一个完整JSON对象
      const lastBrace = jsonStr.lastIndexOf('}')
      if (lastBrace > 0) {
        const tryStr = jsonStr.substring(0, lastBrace + 1)
        // 找到对应的开始位置
        const firstBrace = tryStr.indexOf('{')
        if (firstBrace >= 0) {
          return JSON.parse(tryStr.substring(firstBrace))
        }
      }
      throw new Error("Invalid JSON in response")
    }
  } catch (error) {
    console.error("Generate summary error:", error)
    // 摘要生成失败不中断流程，返回空摘要
    return { overview: "", keyPoints: [], segments: [] }
  }
}
