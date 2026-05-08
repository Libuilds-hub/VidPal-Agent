import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
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
