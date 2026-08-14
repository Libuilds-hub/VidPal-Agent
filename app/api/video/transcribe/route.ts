import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { transcribeAudio, extractAudio } from "@/runtime/video/whisper"
import { getChatModel, LLMNotConfiguredError } from "@/runtime/llm"
import { HumanMessage } from "@langchain/core/messages"
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

interface SummaryResult {
  overview: string
  keyPoints: string[]
  segments: { time: string; title: string; content: string }[]
}

interface TranscriptItem {
  start: string
  startTime: number
  end?: string
  text: string
}

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

async function generateSummary(transcripts: TranscriptItem[]): Promise<SummaryResult> {
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
    const llm = await getChatModel()
    const response = await llm.invoke([new HumanMessage(prompt)])
    const content = response.content as string
    console.log("Summary LLM raw for local video (first 500 chars):", content.slice(0, 500))
    return extractJson(content, false) as SummaryResult
  } catch (error) {
    if (error instanceof LLMNotConfiguredError) {
      console.warn("LLM API key not configured, skipping summary generation")
      return { overview: "", keyPoints: [], segments: [] }
    }
    console.error("Generate summary error for local video:", error)
    return { overview: "", keyPoints: [], segments: [] }
  }
}

async function generateMindmap(transcripts: TranscriptItem[], videoTitle: string | null): Promise<string | null> {
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
    const llm = await getChatModel()
    const response = await llm.invoke([new HumanMessage(prompt)])
    const content = response.content as string
    console.log("Mindmap LLM raw for local video (first 500 chars):", content.slice(0, 500))
    const parsed = extractJson(content, false) as Record<string, unknown>

    const mindmapData = (parsed.nodes ? parsed : (parsed.mindmap && typeof parsed.mindmap === "object" ? parsed.mindmap : null)) as Record<string, unknown> | null

    if (!mindmapData || !mindmapData.nodes || !Array.isArray(mindmapData.nodes) || !mindmapData.edges || !Array.isArray(mindmapData.edges)) {
      console.warn("Mindmap JSON missing nodes/edges arrays:", JSON.stringify(parsed).slice(0, 300))
      return null
    }

    return JSON.stringify(mindmapData)
  } catch (error) {
    if (error instanceof LLMNotConfiguredError) {
      console.warn("LLM API key not configured, skipping mindmap generation")
      return null
    }
    console.error("Generate mindmap error for local video:", error)
    return null
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
    const transcripts = await transcribeAudio(audioPath, "base", "zh") as TranscriptItem[]

    // 删除临时音频文件
    if (existsSync(audioPath)) {
      fs.unlinkSync(audioPath)
    }

    // 生成摘要和思维导图
    let summaryData: any = { overview: "", keyPoints: [], segments: [] }
    let mindmapData: string | null = null

    try {
      summaryData = await generateSummary(transcripts)
    } catch (e) {
      console.error("Generate summary error for local video:", e)
    }

    try {
      mindmapData = await generateMindmap(transcripts, video.title)
    } catch (e) {
      console.error("Generate mindmap error for local video:", e)
    }

    // 更新为 done，保存转录结果、摘要和导图
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "done",
        transcripts: JSON.stringify(transcripts),
        summary: JSON.stringify(summaryData),
        mindmap: mindmapData,
      },
    })

    return NextResponse.json({
      videoId,
      transcripts,
      summary: summaryData,
      mindmap: mindmapData,
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