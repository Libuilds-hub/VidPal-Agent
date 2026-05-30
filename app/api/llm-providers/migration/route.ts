import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// POST — migrate old key-value LLM settings to the new LlmProvider table
export async function POST() {
  // Check if migration already done
  const existingCount = await prisma.llmProvider.count()
  if (existingCount > 0) {
    return NextResponse.json({ migrated: false, message: "已有供应商数据，跳过迁移" })
  }

  const settings = await prisma.setting.findMany()
  const map: Record<string, string> = {}
  settings.forEach((s) => { map[s.key] = s.value })

  const llmProvider = map.llmProvider || "minimax"
  const apiKey = map.llmApiKey
  const model = map.llmModel

  // Only migrate if API key is configured
  if (!apiKey) {
    return NextResponse.json({ migrated: false, message: "未配置 LLM API Key，跳过迁移" })
  }

  const providers: Record<string, { name: string; baseUrl: string }> = {
    minimax: { name: "MiniMax", baseUrl: "https://api.minimaxi.com/v1" },
    deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com" },
    openrouter: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  }

  const info = providers[llmProvider] || providers.minimax
  const models = model || (
    llmProvider === "openrouter" ? "deepseek/deepseek-v4-flash:free" :
    llmProvider === "deepseek" ? "deepseek-v4-flash" :
    "MiniMax-M2.7"
  )

  await prisma.llmProvider.create({
    data: {
      name: info.name,
      apiKey,
      baseUrl: info.baseUrl,
      models,
      isDefault: true,
      enabled: true,
    },
  })

  // 清理旧的 Key-Value 设置，防止以后删除所有服务商时触发重复迁移
  await prisma.setting.deleteMany({
    where: {
      key: { in: ["llmProvider", "llmApiKey", "llmModel"] }
    }
  })

  return NextResponse.json({ migrated: true, message: `已将 ${info.name} 迁移至供应商列表` })
}
