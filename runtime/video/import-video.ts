// runtime/video/import-video.ts —— import_video / regenerate 任务处理器
// 阶段模型: info → download → transcode → transcribe → summarize（本地上传跳过 download/transcode）
// 阶段跳过: 每阶段执行前检查产物存在性（planStages），崩溃恢复后已完成阶段秒过
import path from "path"
import fs from "fs"
import { prisma, isMp4Complete } from "./db"
import { getVideoInfo, downloadVideo, downloadThumbnail, recoverVideoFile } from "./yt-dlp"
import { extractAudio, transcribeAudio } from "./whisper"
import { generateSummary, generateMindmap } from "./summarize"
import type { TaskHandler, TaskContext } from "../tasks/registry"

export type StageName = "info" | "download" | "transcode" | "transcribe" | "summarize"

export interface StagePlanInput {
  video: {
    title: string | null
    localPath: string | null
    transcripts: string | null
    summary: string | null
    mindmap: string | null
  }
  files: { originalMp4: boolean; videoMp4: boolean }
  isLocalUpload: boolean
}

/** 根据产物存在性计算待执行阶段（纯函数，可单测） */
export function planStages(input: StagePlanInput): StageName[] {
  const { video, files, isLocalUpload } = input
  const stages: StageName[] = []

  if (isLocalUpload) {
    // 本地上传：文件已就位，直接转写
  } else {
    if (!video.title) stages.push("info")
    if (!files.originalMp4 && !files.videoMp4) stages.push("download") // 下载+转码一步
    if (files.originalMp4 && !files.videoMp4) stages.push("transcode") // 崩溃恢复：从 original 续转码
  }
  if (!video.transcripts) stages.push("transcribe")
  if (!video.summary || !video.mindmap) stages.push("summarize")
  return stages
}

function videoDirOf(videoId: string): string {
  return path.join(process.cwd(), "public", "videos", videoId)
}

export const importVideoHandler: TaskHandler = {
  type: "import_video",
  async run(ctx: TaskContext) {
    const input = ctx.input as { url?: string; localPath?: string; title?: string }
    const isLocalUpload = !!input.localPath && !input.url

    // ---- 建行/复用 ----
    ctx.emit("stage", { stage: "init" })
    let video = isLocalUpload
      ? await prisma.video.create({
          data: { title: input.title ?? "本地视频", source: "local", localPath: input.localPath, status: "transcribing" },
        })
      : await prisma.video.findFirst({ where: { url: input.url } })
    if (!video) {
      video = await prisma.video.create({
        data: { source: "bilibili", url: input.url, status: "downloading" },
      })
    } else {
      await prisma.video.update({ where: { id: video.id }, data: { status: "downloading" } })
    }
    const videoId = video.id
    ctx.emit("log", { message: `视频记录就绪: ${videoId}` })
    ctx.checkCancelled()

    // ---- 阶段循环（planStages 决定执行哪些阶段，产物存在即跳过）----
    const dir = videoDirOf(videoId)
    fs.mkdirSync(dir, { recursive: true })
    const originalPath = path.join(dir, "original.mp4")
    const videoPath = path.join(dir, "video.mp4")
    const files = {
      originalMp4: isMp4Complete(originalPath),
      videoMp4: isMp4Complete(videoPath),
    }
    const stages = planStages({
      video: {
        title: video.title,
        localPath: video.localPath,
        transcripts: video.transcripts,
        summary: video.summary,
        mindmap: video.mindmap,
      },
      files,
      isLocalUpload,
    })

    for (const stage of stages) {
      ctx.emit("stage", { stage })
      ctx.checkCancelled()

      switch (stage) {
        case "info": {
          try {
            const info = await getVideoInfo(input.url!)
            const localThumbnail = info.thumbnail
              ? await downloadThumbnail(info.thumbnail, videoId)
              : null
            await prisma.video.update({
              where: { id: videoId },
              data: { title: info.title, duration: info.duration, thumbnail: localThumbnail },
            })
            ctx.emit("log", { message: `已获取视频信息: ${info.title}` })
          } catch (err) {
            ctx.emit("log", { message: `获取视频信息失败（继续下载）: ${err instanceof Error ? err.message : err}` })
          }
          break
        }
        case "download": {
          // downloadVideo = yt-dlp 下载 original.mp4 + 转码 video.mp4 + 清理 original
          await downloadVideo(input.url!, videoId)
          ctx.emit("log", { message: "下载与转码完成" })
          break
        }
        case "transcode": {
          // 崩溃恢复路径：original.mp4 完整、video.mp4 缺失/损坏 → 从 original 续转码
          const localPath = await recoverVideoFile(videoId)
          await prisma.video.update({ where: { id: videoId }, data: { localPath } })
          ctx.emit("log", { message: "恢复转码完成" })
          break
        }
        case "transcribe": {
          const audioPath = path.join(dir, "audio.mp3")
          await extractAudio(videoPath, audioPath)
          const transcripts = await transcribeAudio(audioPath, "base", "zh")
          ctx.emit("log", { message: `转录完成: ${transcripts.length} 段` })
          await prisma.video.update({
            where: { id: videoId },
            data: { status: "transcribing", transcripts: JSON.stringify(transcripts) },
          })
          break
        }
        case "summarize": {
          const cur = await prisma.video.findUnique({ where: { id: videoId } })
          const transcripts = JSON.parse(cur?.transcripts ?? "[]") as {
            start: string
            startTime: number
            text: string
          }[]
          const summary = await generateSummary(transcripts)
          const mindmap = await generateMindmap(transcripts, cur?.title ?? null)
          const summaryOk = summary.overview && summary.overview.length > 0
          const mindmapOk = mindmap != null
          if (!summaryOk && !mindmapOk) {
            await prisma.video.update({
              where: { id: videoId },
              data: { status: "error", error: "LLM 摘要与导图均生成失败，请检查 API Key 与模型配置" },
            })
            throw new Error("LLM generation failed")
          }
          await prisma.video.update({
            where: { id: videoId },
            data: { status: "done", localPath: `/videos/${videoId}/video.mp4`, summary: JSON.stringify(summary), mindmap },
          })
          ctx.emit("log", { message: "摘要与思维导图完成" })
          break
        }
      }
    }

    // 全部阶段完成后兜底置 done
    const final = await prisma.video.findUnique({ where: { id: videoId } })
    if (final && final.status !== "done" && final.status !== "error") {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "done", localPath: `/videos/${videoId}/video.mp4` },
      })
    }
    ctx.setResult({ videoId, status: "done" })
  },
}

export const regenerateHandler: TaskHandler = {
  type: "regenerate",
  async run(ctx: TaskContext) {
    const { videoId } = ctx.input as { videoId: string }
    const video = await prisma.video.findUnique({ where: { id: videoId } })
    if (!video) throw new Error(`视频不存在: ${videoId}`)
    if (!video.transcripts) throw new Error("该视频尚无转录内容")
    ctx.emit("stage", { stage: "summarize" })
    const transcripts = JSON.parse(video.transcripts) as {
      start: string
      startTime: number
      text: string
    }[]
    const summary = await generateSummary(transcripts)
    const mindmap = await generateMindmap(transcripts, video.title)
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "done", summary: JSON.stringify(summary), mindmap },
    })
    ctx.setResult({ videoId, status: "done" })
  },
}
