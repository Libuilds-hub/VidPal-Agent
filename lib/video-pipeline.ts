import { prisma } from "@/lib/db"
import { getVideoInfo, downloadVideo, downloadThumbnail, recoverVideoFile, isMp4Complete } from "@/lib/yt-dlp"
import { getChatModel, LLMNotConfiguredError } from "@/lib/llm"
import { HumanMessage } from "@langchain/core/messages"
import { extractAudio, transcribeAudio } from "@/lib/whisper"
import path from "path"
import fs from "fs"

/**
 * 当前进程内正在执行的后台任务（下载/转码/转录）集合。
 * 用于恢复逻辑区分「进程崩溃遗留的僵尸任务」与「本进程仍在运行的任务」，
 * 避免恢复逻辑与正在运行的任务并发写同一批文件。
 */
const activeVideoIds = new Set<string>()

export function isVideoActive(videoId: string): boolean {
  return activeVideoIds.has(videoId)
}

export async function downloadVideoAsync(videoId: string, url: string) {
  if (activeVideoIds.has(videoId)) {
    console.warn(`[pipeline] ${videoId} 已有进行中的任务，跳过重复触发`)
    return
  }
  activeVideoIds.add(videoId)
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

    // 先释放下载任务的注册，再触发转录（transcribeAsync 内部会重新注册自身）
    activeVideoIds.delete(videoId)
    transcribeAsync(videoId, path.join(process.cwd(), "public", localPath), info.title)

  } catch (error) {
    console.error("Download error:", error)
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "error",
        error: error instanceof Error ? error.message : "Download failed",
      },
    })
  } finally {
    activeVideoIds.delete(videoId)
  }
}

/**
 * 恢复被中断的下载任务（进程崩溃/服务器重启后遗留）：
 * 利用本地已有的 original.mp4 或 video.mp4 继续推进，无需重新联网下载。
 * 返回 true 表示已恢复（正在后台转码/转录），false 表示不可恢复（文件缺失）。
 */
export async function resumeInterruptedDownload(videoId: string): Promise<boolean> {
  if (activeVideoIds.has(videoId)) {
    console.warn(`[recover] ${videoId} 正在运行，跳过`)
    return true
  }
  try {
    const localPath = await recoverVideoFile(videoId)
    const video = await prisma.video.findUnique({ where: { id: videoId } })
    await prisma.video.update({
      where: { id: videoId },
      data: {
        localPath,
        status: "transcribing",
      },
    })
    console.log(`[recover] ${videoId}: 文件就绪，继续转录流程`)
    // 转录为后台任务，不等待（transcribeAsync 内部自行管理 activeVideoIds）
    void transcribeAsync(videoId, path.join(process.cwd(), "public", localPath), video?.title ?? null)
    return true
  } catch (error) {
    console.error(`[recover] ${videoId} 无法恢复:`, error)
    return false
  }
}

export async function transcribeAsync(videoId: string, localPath: string, videoTitle: string | null) {
  if (activeVideoIds.has(videoId)) {
    console.warn(`[pipeline] ${videoId} 已有进行中的任务，跳过重复转录`)
    return
  }
  activeVideoIds.add(videoId)
  try {
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
  } finally {
    activeVideoIds.delete(videoId)
  }
}

export interface SummaryResult {
  overview: string
  keyPoints: string[]
  segments: { time: string; title: string; content: string }[]
}

export interface TranscriptItem {
  start: string
  startTime: number
  end: string
  text: string
}

/**
 * Strip thinking tags and markdown fences, then extract valid JSON from LLM response.
 * Uses bracket counting to find complete JSON structures, not fragile regex.
 */
export function extractJson(raw: string, expectArray: boolean): unknown {
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

export async function generateSummary(transcripts: { start: string; startTime: number; text: string }[]): Promise<SummaryResult> {
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
    const llm = await getChatModel()
    const response = await llm.invoke([new HumanMessage(prompt)])
    const content = response.content as string
    console.log("Summary LLM raw (first 500 chars):", content.slice(0, 500))
    return extractJson(content, false) as SummaryResult
  } catch (error) {
    if (error instanceof LLMNotConfiguredError) {
      console.warn("LLM API key not configured, skipping summary generation")
      return { overview: "", keyPoints: [], segments: [] }
    }
    console.error("Generate summary error:", error)
    return { overview: "", keyPoints: [], segments: [] }
  }
}

export async function generateMindmap(transcripts: { start: string; startTime: number; text: string }[], videoTitle: string | null): Promise<string | null> {
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
    const llm = await getChatModel()
    const response = await llm.invoke([new HumanMessage(prompt)])
    const content = response.content as string
    console.log("Mindmap LLM raw (first 500 chars):", content.slice(0, 500))
    const parsed = extractJson(content, false) as Record<string, unknown>

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
    if (error instanceof LLMNotConfiguredError) {
      console.warn("LLM API key not configured, skipping mindmap generation")
      return null
    }
    console.error("Generate mindmap error:", error)
    return null
  }
}

/** 供恢复逻辑判断视频文件是否完整可用 */
export function isVideoFileComplete(videoId: string): boolean {
  const videoPath = path.join(process.cwd(), "public", "videos", videoId, "video.mp4")
  return fs.existsSync(videoPath) && isMp4Complete(videoPath)
}
