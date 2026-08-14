// app/api/video/upload/route.ts —— 保存上传文件到 public/uploads，然后委托 Runtime 转写
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, unlink } from "fs/promises"
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

    // 委托 Runtime：创建视频记录并执行转写/摘要。
    // uploads 副本会一直保留到 Runtime 把它复制进视频目录（video.mp4），期间双份存储是 P2 接受的设计；
    // 但任务提交失败时这里不能留孤儿文件 —— 立即清理后重抛，由外层 catch 统一返回 502。
    let result: Awaited<ReturnType<typeof runtime.submitTask>>
    try {
      result = await runtime.submitTask({
        type: "import_video",
        input: { localPath: `/uploads/${fileName}`, title: file.name },
        idempotencyKey: `upload:${fileName}`,
      })
    } catch (error) {
      await unlink(filePath).catch(() => {}) // 清理失败不掩盖原始错误
      throw error
    }

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
