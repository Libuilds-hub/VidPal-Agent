// app/api/video/upload/route.ts —— 保存上传文件到 public/uploads，然后委托 Runtime 转写
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { createRuntimeClient } from "@/lib/runtime-client"

const runtime = createRuntimeClient()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })

    const uniqueId = crypto.randomUUID()
    const ext = path.extname(file.name)
    const fileName = `${uniqueId}${ext}`
    const filePath = path.join(uploadDir, fileName)

    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // 委托 Runtime：创建视频记录并执行转写/摘要
    const result = await runtime.submitTask({
      type: "import_video",
      input: { localPath: `/uploads/${fileName}`, title: file.name },
      idempotencyKey: `upload:${fileName}`,
    })

    return NextResponse.json({
      taskId: result.taskId,
      title: file.name,
      localPath: `/uploads/${fileName}`,
      status: result.status,
    })
  } catch (error) {
    console.error("Upload video error:", error)
    const message = error instanceof Error ? error.message : "Failed to upload video"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
