import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 生成唯一文件名
    const uniqueId = crypto.randomUUID()
    const ext = path.extname(file.name)
    const fileName = `${uniqueId}${ext}`
    const filePath = path.join(uploadDir, fileName)

    // 保存文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 创建视频记录
    const video = await prisma.video.create({
      data: {
        title: file.name,
        source: "local",
        localPath: `/uploads/${fileName}`,
        status: "pending",
      },
    })

    return NextResponse.json({
      id: video.id,
      title: video.title,
      source: video.source,
      localPath: video.localPath,
      status: video.status,
    })
  } catch (error) {
    console.error("Upload video error:", error)
    return NextResponse.json({ error: "Failed to upload video" }, { status: 500 })
  }
}
