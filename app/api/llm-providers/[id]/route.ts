import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { clearRuntimeLlmCache } from "@/lib/runtime-client"

// GET — get full provider (with unmasked key for editing)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await prisma.llmProvider.findUnique({ where: { id } })
  if (!p) return NextResponse.json({ error: "供应商不存在" }, { status: 404 })
  return NextResponse.json(p)
}

// PUT — update a provider
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, apiKey, baseUrl, models, isDefault, enableThinking, enabled, logo } = await req.json()

  const existing = await prisma.llmProvider.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "供应商不存在" }, { status: 404 })

  if (isDefault) {
    await prisma.llmProvider.updateMany({ data: { isDefault: false } })
  }

  const updated = await prisma.llmProvider.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      apiKey: apiKey ?? existing.apiKey,
      baseUrl: baseUrl ?? existing.baseUrl,
      models: models ?? existing.models,
      isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      enableThinking: enableThinking !== undefined ? enableThinking : existing.enableThinking,
      enabled: enabled !== undefined ? enabled : existing.enabled,
      logo: logo !== undefined ? logo : existing.logo,
    },
  })

  // 写操作后通知 Runtime 清除 LLM 缓存（fire-and-forget：不阻塞响应、Runtime 不可用也静默）
  void clearRuntimeLlmCache()

  return NextResponse.json(updated)
}

// DELETE — delete a provider
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.llmProvider.delete({ where: { id } })
  // 写操作后通知 Runtime 清除 LLM 缓存（fire-and-forget：不阻塞响应、Runtime 不可用也静默）
  void clearRuntimeLlmCache()
  return NextResponse.json({ success: true })
}

// POST — test connection
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await prisma.llmProvider.findUnique({ where: { id } })
  if (!p) return NextResponse.json({ error: "供应商不存在" }, { status: 404 })

  const { model } = await req.json()
  const testModel = model || p.models.split(",")[0]?.trim() || "gpt-3.5-turbo"

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${p.apiKey}`,
    }
    if (p.baseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "http://localhost:3000"
      headers["X-Title"] = "Video Shancn"
    }

    const response = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      let errMsg = data.error?.message || `HTTP ${response.status}`
      if (errMsg.includes("Provider returned error")) {
        errMsg = "OpenRouter 绑定的上游供应商返回了错误。通常这是因为上游服务（如 DeepSeek 等）目前非常繁忙、暂时宕机或达到了免费额度限制。建议稍后重试，或尝试添加其他可用模型（例如更换为非 free 的模型或换用 DeepSeek/MiniMax 官方供应商）。"
      }
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: response.status },
      )
    }

    return NextResponse.json({ success: true, message: "连接成功" })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "连接失败" },
      { status: 500 },
    )
  }
}
