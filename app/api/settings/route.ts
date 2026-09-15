import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// 这些 Setting 的值是密钥 / 登录凭证：GET 时一律脱敏，绝不明文返回给浏览器。
const SECRET_SETTING_KEYS = new Set([
  "bilibiliCookie",
  "youtubeCookie",
  "llmApiKey",
  "openclawKey",
  "hermesKey",
  "claudeCodeKey",
])

export interface SecretMeta {
  /** 是否已配置（值非空） */
  set: boolean
  /** 脱敏预览，供界面提示使用 */
  preview: string
}

function maskSecret(value: string): string {
  if (!value) return ""
  if (value.length <= 10) return "********"
  return `${value.slice(0, 4)}********${value.slice(-4)}`
}

function isMaskedValue(value: string, stored: string | undefined): boolean {
  return stored !== undefined && value === maskSecret(stored)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 支持 { settings: {...} } 和 { key: value } 两种格式
    const entries = body.settings || body

    const keys = Object.keys(entries).filter((k) => k !== "settings")
    const stored = keys.length
      ? await prisma.setting.findMany({ where: { key: { in: keys } } })
      : []
    const storedMap: Record<string, string> = {}
    for (const s of stored) storedMap[s.key] = s.value

    for (const [key, value] of Object.entries(entries)) {
      if (key === "settings") continue
      const str = String(value)
      // 防回写：前端把脱敏预览原样提交时忽略，避免用掩码覆盖真实密钥。
      if (SECRET_SETTING_KEYS.has(key) && isMaskedValue(str, storedMap[key])) continue
      await prisma.setting.upsert({
        where: { key },
        update: { value: str },
        create: { key, value: str },
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
    const secrets: Record<string, SecretMeta> = {}

    for (const s of settings) {
      if (SECRET_SETTING_KEYS.has(s.key)) {
        secrets[s.key] = { set: s.value.length > 0, preview: maskSecret(s.value) }
        continue
      }
      result[s.key] = s.value
    }

    // 密钥只以元信息形式暴露「是否已配置 + 脱敏预览」，明文不出服务端。
    return NextResponse.json({ ...result, __secrets: secrets })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 })
  }
}
