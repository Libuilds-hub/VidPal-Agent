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
    transcribeAsync(videoId, localPath, info.title)

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

async function transcribeAsync(videoId: string, localPath: string, videoTitle: string | null) {
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
    console.log("Transcription complete for video:", videoId)

    // 生成摘要（直接用原始转录，纠错步骤已跳过——MiniMax think 模式会消耗全部 token 导致无输出）
    const summary = await generateSummary(transcripts)

    // 生成思维导图
    const mindmap = await generateMindmap(transcripts, videoTitle)

    const summaryOk = summary.overview && summary.overview.length > 0
    const mindmapOk = mindmap != null

    // Both LLM steps failed — don't pretend we're done
    if (!summaryOk && !mindmapOk) {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: "error",
          error: "LLM generation failed: both summary and mindmap are empty. Check API key and model settings.",
          transcripts: JSON.stringify(transcripts),
        },
      })
      console.error("LLM generation completely failed for video:", videoId)
      return
    }

    // 更新为完成，保存转录结果和摘要
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "done",
        transcripts: JSON.stringify(transcripts),
        summary: JSON.stringify(summary),
        mindmap,
      },
    })

    console.log("Transcription, summary and mindmap complete for video:", videoId)
    if (!summaryOk) console.warn("  summary empty")
    if (!mindmapOk) console.warn("  mindmap null")

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

interface TranscriptItem {
  start: string
  startTime: number
  end: string
  text: string
}

/**
 * Strip thinking tags and markdown fences, then extract valid JSON from LLM response.
 * Uses bracket counting to find complete JSON structures, not fragile regex.
 */
function extractJson(raw: string, expectArray: boolean): unknown {
  let text = raw
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")

  // Strip markdown code fences
  text = text
    .replace(/^```(?:json|mermaid)?\s*$/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim()

  const bracket = expectArray ? "[" : "{"
  const closeBracket = expectArray ? "]" : "}"

  // Find first bracket to start extraction
  const start = text.indexOf(bracket)
  if (start < 0) throw new Error(`No JSON ${expectArray ? "array" : "object"} found in response`)

  // Bracket counting with string awareness — ignores brackets inside quoted strings
  const extract = text.slice(start)
  let depth = 0
  let end = -1
  const startChar = expectArray ? "[" : "{"
  const endChar = expectArray ? "]" : "}"
  let inString = false

  for (let i = 0; i < extract.length; i++) {
    const ch = extract[i]
    if (ch === '\\' && inString) {
      i++ // skip escaped character
      continue
    }
    if (ch === '"') {
      inString = !inString
    } else if (!inString) {
      if (ch === startChar) {
        depth++
      } else if (ch === endChar) {
        depth--
        if (depth === 0) { end = i + 1; break }
      }
    }
  }

  if (end < 0) throw new Error(`Unterminated JSON ${expectArray ? "array" : "object"}`)
  return JSON.parse(extract.slice(0, end))
}

async function correctTranscripts(transcripts: TranscriptItem[], videoTitle: string | null): Promise<TranscriptItem[]> {
  // 读取 LLM 设置
  const settings = await prisma.setting.findMany()
  const settingMap: Record<string, string> = {}
  settings.forEach((s) => { settingMap[s.key] = s.value })

  const provider = settingMap.llmProvider || "minimax"
  const apiKey = settingMap.llmApiKey
  const model = settingMap.llmModel || (provider === "deepseek" ? "deepseek-v4-flash" : "MiniMax-M2.7")

  if (!apiKey) {
    console.warn("LLM API key not configured, skipping transcript correction")
    return transcripts
  }

  const baseUrl = provider === "deepseek"
    ? "https://api.deepseek.com"
    : "https://api.minimaxi.com/v1"

  // 构建字幕文本
  const transcriptText = transcripts
    .map((t, i) => `[${i}] [${t.start}] ${t.text}`)
    .join("\n")

  const prompt = `你是一个专业的字幕纠错助手。请对以下${videoTitle ? `关于"${videoTitle}"的` : ''}视频字幕进行纠错：
1. 修正错别字
2. 修正标点符号
3. 修正语气词和不流畅的表达
4. 根据视频主题上下文修正专有名词和技术术语
5. 保持原意、时间不变

视频主题：${videoTitle || "未知"}

字幕：
${transcriptText}

请以 JSON 数组格式输出，格式与输入相同：start（时间字符串）, startTime（数字）, end（时间字符串）, text（纠错后的文本）
只输出 JSON 数组，不要有其他内容。`

  try {
    console.log("Correcting transcripts...")
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
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

    return extractJson(content, true) as TranscriptItem[]
  } catch (error) {
    console.error("Correct transcripts error:", error)
    // 纠错失败返回原始 transcripts
    return transcripts
  }
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

    console.log("Summary LLM raw (first 500 chars):", content.slice(0, 500))
    return extractJson(content, false) as SummaryResult
  } catch (error) {
    console.error("Generate summary error:", error)
    // 摘要生成失败不中断流程，返回空摘要
    return { overview: "", keyPoints: [], segments: [] }
  }
}

async function generateMindmap(transcripts: { start: string; startTime: number; text: string }[], videoTitle: string | null): Promise<string | null> {
  // 读取 LLM 设置
  const settings = await prisma.setting.findMany()
  const settingMap: Record<string, string> = {}
  settings.forEach((s) => { settingMap[s.key] = s.value })

  const provider = settingMap.llmProvider || "minimax"
  const apiKey = settingMap.llmApiKey
  const model = settingMap.llmModel || (provider === "deepseek" ? "deepseek-v4-flash" : "MiniMax-M2.7")

  if (!apiKey) {
    console.warn("LLM API key not configured, skipping mindmap generation")
    return null
  }

  const baseUrl = provider === "deepseek"
    ? "https://api.deepseek.com"
    : "https://api.minimaxi.com/v1"

  // 构建字幕文本，截取前 4000 字控制 token
  const transcriptText = transcripts
    .map((t) => `[${t.start}] ${t.text}`)
    .join("\n")
    .slice(0, 4000)

  const prompt = `你是视频内容分析专家。根据以下视频字幕，生成结构化的思维导图。

视频主题：${videoTitle || "未知"}

字幕内容：
${transcriptText}

要求：
1. 根节点 id 固定为 "root"，label 为视频主题
2. 从字幕中提取 3-5 个核心话题作为一级分支，每个分支下再有 2-4 个子节点
3. 节点 ID 使用 "n1", "n2", "n3" 等格式，不能重复
4. 每个节点的 label 用中文，控制在 15 字以内，概括核心内容
5. edges 数组中每条边有 source（父节点ID）和 target（子节点ID）
6. 思维导图层级深度控制在 3 层以内

只输出以下 JSON 格式，不要有其他内容：
{
  "nodes": [
    { "id": "root", "label": "视频主题" },
    { "id": "n1", "label": "分支主题" },
    { "id": "n2", "label": "子主题" }
  ],
  "edges": [
    { "source": "root", "target": "n1" },
    { "source": "n1", "target": "n2" }
  ]
}`

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

    const parsed = extractJson(content, false) as Record<string, unknown>

    console.log("Mindmap LLM raw (first 500 chars):", content.slice(0, 500))
    console.log("Mindmap parsed keys:", Object.keys(parsed).join(", "))

    // Unwrap if LLM wrapped data in a key like { "mindmap": { nodes, edges } }
    const mindmapData = (parsed.nodes ? parsed : (parsed.mindmap && typeof parsed.mindmap === "object" ? parsed.mindmap : null)) as Record<string, unknown> | null

    if (!mindmapData || !mindmapData.nodes || !Array.isArray(mindmapData.nodes) || !mindmapData.edges || !Array.isArray(mindmapData.edges)) {
      console.warn("Mindmap JSON missing nodes/edges arrays:", JSON.stringify(parsed).slice(0, 300))
      return null
    }

    console.log("Mindmap OK: %d nodes, %d edges", (mindmapData.nodes as any[]).length, (mindmapData.edges as any[]).length)
    return JSON.stringify(mindmapData)
  } catch (error) {
    console.error("Generate mindmap error:", error)
    return null
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

    let transcripts: TranscriptItem[]
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
