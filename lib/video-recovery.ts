import { prisma } from "@/lib/db"
import { resumeInterruptedDownload, transcribeAsync, isVideoActive, isVideoFileComplete } from "@/lib/video-pipeline"
import path from "path"

/**
 * 中断任务恢复（服务器重启 / 进程崩溃后自动修复僵尸状态）。
 *
 * 触发时机：
 * 1. instrumentation.ts register()（服务启动时）
 * 2. GET /api/video 首次访问（单飞，防止启动后遗漏）
 *
 * 规则：
 * - status = downloading：
 *   若本地文件可恢复（video.mp4 完整，或 original.mp4 完整可重新转码）→ 继续流水线；
 *   否则 → 标记 error（文件缺失，需用户重新导入）。
 * - status = transcribing：
 *   若 video.mp4 完整且尚未生成 transcripts → 重新执行转录；
 *   否则 → 标记 error。
 *
 * 全程幂等：本进程正在运行的任务（activeVideoIds）会被跳过。
 */
let recoveryPromise: Promise<void> | null = null

export function recoverInterruptedVideos(): Promise<void> {
  if (!recoveryPromise) {
    recoveryPromise = runRecovery()
      .catch((err) => console.error("[recover] 恢复任务异常:", err))
      .finally(() => {
        recoveryPromise = null
      })
  }
  return recoveryPromise
}

async function runRecovery(): Promise<void> {
  console.log("[recover] 开始扫描中断的视频任务...")

  const stuck = await prisma.video.findMany({
    where: {
      status: { in: ["downloading", "transcribing"] },
    },
  })

  if (stuck.length === 0) {
    console.log("[recover] 没有需要恢复的任务")
    return
  }

  console.log(`[recover] 发现 ${stuck.length} 个中断任务:`, stuck.map((v) => `${v.id}(${v.status})`).join(", "))

  for (const video of stuck) {
    if (isVideoActive(video.id)) {
      console.log(`[recover] ${video.id} 正在运行，跳过`)
      continue
    }

    try {
      if (video.status === "downloading") {
        const resumed = await resumeInterruptedDownload(video.id)
        if (!resumed) {
          await markUnrecoverable(video.id)
        }
      } else {
        // transcribing
        if (!video.transcripts && isVideoFileComplete(video.id)) {
          console.log(`[recover] ${video.id}: 转录中断，重新执行转录`)
          await prisma.video.update({
            where: { id: video.id },
            data: { status: "transcribing" },
          })
          void transcribeAsync(
            video.id,
            path.join(process.cwd(), "public", "videos", video.id, "video.mp4"),
            video.title
          )
        } else {
          await markUnrecoverable(video.id)
        }
      }
    } catch (err) {
      console.error(`[recover] ${video.id} 处理失败:`, err)
      await markUnrecoverable(video.id)
    }
  }

  console.log("[recover] 扫描完成")
}

async function markUnrecoverable(videoId: string): Promise<void> {
  console.error(`[recover] ${videoId}: 本地文件缺失或损坏，标记为 error`)
  await prisma.video.update({
    where: { id: videoId },
    data: {
      status: "error",
      error: "下载/处理中断：本地文件缺失或损坏，请删除该视频后重新导入",
    },
  })
}
