import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { recoverInterruptedVideos } from "@/lib/video-recovery"

export async function GET(request: NextRequest) {
  try {
    // 懒触发一次中断任务恢复（单飞 + 幂等）：页面轮询本接口时，
    // 若上次进程崩溃遗留了 downloading/transcribing 僵尸任务，自动续跑
    void recoverInterruptedVideos()

    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source")

    const where = source ? { source } : {}

    const videos = await prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(videos)
  } catch (error) {
    console.error("List videos error:", error)
    return NextResponse.json({ error: "Failed to list videos" }, { status: 500 })
  }
}
