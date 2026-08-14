// app/api/video/parse/route.ts —— 委托 Runtime：import_video / regenerate 任务
import { NextRequest, NextResponse } from "next/server"
import { createRuntimeClient } from "@/lib/runtime-client"

const runtime = createRuntimeClient()
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })
    // 来源检测：B 站 / YouTube，其余来源不支持
    let source: string
    if (url.includes("bilibili.com")) {
      source = "bilibili"
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      source = "youtube"
    } else {
      return NextResponse.json({ error: "Unsupported video source" }, { status: 400 })
    }
    const result = await runtime.submitTask({
      type: "import_video",
      input: { url, source },
      idempotencyKey: `video:${url}`,
    })
    return NextResponse.json({ taskId: result.taskId, status: result.status })
  } catch (error) {
    console.error("Parse video error:", error)
    const message = error instanceof Error ? error.message : "Failed to parse video"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { videoId } = await request.json()
    if (!videoId) return NextResponse.json({ error: "videoId is required" }, { status: 400 })
    const result = await runtime.submitTask({
      type: "regenerate",
      input: { videoId },
      idempotencyKey: `regenerate:${videoId}`,
    })
    return NextResponse.json({ taskId: result.taskId, status: result.status })
  } catch (error) {
    console.error("Regenerate error:", error)
    const message = error instanceof Error ? error.message : "Regenerate failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
