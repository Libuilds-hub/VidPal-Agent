import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 支持 { settings: {...} } 和 { key: value } 两种格式
    const entries = body.settings || body

    for (const [key, value] of Object.entries(entries)) {
      if (key === "settings") continue
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }

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
