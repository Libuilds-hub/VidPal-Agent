import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { llmProvider, llmApiKey, llmModel } = await request.json()

    if (!llmProvider || !llmApiKey || !llmModel) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 保存配置
    await prisma.setting.upsert({
      where: { key: "llmProvider" },
      update: { value: llmProvider },
      create: { key: "llmProvider", value: llmProvider },
    })

    await prisma.setting.upsert({
      where: { key: "llmApiKey" },
      update: { value: llmApiKey },
      create: { key: "llmApiKey", value: llmApiKey },
    })

    await prisma.setting.upsert({
      where: { key: "llmModel" },
      update: { value: llmModel },
      create: { key: "llmModel", value: llmModel },
    })

    return NextResponse.json({ success: true, message: "设置已保存" })
  } catch (error) {
    console.error("Save settings error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    const result: Record<string, string> = {}
    settings.forEach((s) => {
      result[s.key] = s.value
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 })
  }
}