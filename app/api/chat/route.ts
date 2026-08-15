// app/api/chat/route.ts —— 代理 Runtime 聊天端点（SSE 透传，事件契约不变）
import { NextRequest } from "next/server"
import { createRuntimeClient } from "@/lib/runtime-client"

const runtime = createRuntimeClient()

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const upstream = await fetch(`${runtime.baseUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "")
    return new Response(text || JSON.stringify({ error: "Runtime 聊天不可用" }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  // SSE 透传：把 Runtime 的流原样转发给浏览器
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
