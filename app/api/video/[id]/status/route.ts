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
      select: {
        id: true,
        status: true,
        error: true,
      },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Get video status error:", error)
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, error } = await request.json()

    const video = await prisma.video.update({
      where: { id },
      data: {
        status,
        error,
      },
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error("Update video status error:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
