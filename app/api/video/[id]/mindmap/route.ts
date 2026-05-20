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
      select: { mindmap: true },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json({ mindmap: video.mindmap || null })
  } catch (error) {
    console.error("Get mindmap error:", error)
    return NextResponse.json({ error: "Failed to get mindmap" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { mindmap } = await request.json()

    const video = await prisma.video.findUnique({
      where: { id },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    await prisma.video.update({
      where: { id },
      data: { mindmap },
    })

    return NextResponse.json({ success: true, mindmap })
  } catch (error) {
    console.error("Update mindmap error:", error)
    return NextResponse.json({ error: "Failed to update mindmap" }, { status: 500 })
  }
}