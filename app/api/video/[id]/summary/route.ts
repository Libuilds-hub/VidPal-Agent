import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const video = await prisma.video.findUnique({
      where: { id },
    })

    if (!video) {
      return NextResponse.json({ error: "视频未找到" }, { status: 404 })
    }

    return NextResponse.json({
      summary: video.summary || null,
    })
  } catch (error) {
    console.error("Get summary error:", error)
    return NextResponse.json({ error: "获取摘要失败" }, { status: 500 })
  }
}