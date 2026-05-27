import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET — list all providers (mask API keys partially)
export async function GET() {
  const providers = await prisma.llmProvider.findMany({
    orderBy: { createdAt: "asc" },
  })
  const list = providers.map((p) => ({
    ...p,
    apiKey: maskKey(p.apiKey),
  }))
  return NextResponse.json(list)
}

// POST — create a new provider
export async function POST(req: NextRequest) {
  const { name, apiKey, baseUrl, models, isDefault, enableThinking } = await req.json()
  if (!name || !apiKey || !baseUrl) {
    return NextResponse.json({ error: "名称、API Key 和 Base URL 为必填项" }, { status: 400 })
  }

  // If this is set as default, unset other defaults
  if (isDefault) {
    await prisma.llmProvider.updateMany({ data: { isDefault: false } })
  }

  const provider = await prisma.llmProvider.create({
    data: { 
      name, 
      apiKey, 
      baseUrl, 
      models: models || "", 
      isDefault: !!isDefault,
      enableThinking: enableThinking !== undefined ? !!enableThinking : true 
    },
  })

  return NextResponse.json({ ...provider, apiKey: maskKey(provider.apiKey) })
}

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "****"
  return key.slice(0, 4) + "****" + key.slice(-4)
}
