import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey, model } = await request.json()

    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }

    if (baseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "http://localhost:3000"
      headers["X-Title"] = "Video Shancn"
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      let errMsg = data.error?.message || "API 请求失败"
      if (errMsg.includes("Provider returned error")) {
        errMsg = "OpenRouter 绑定的上游供应商返回了错误。通常这是因为上游服务（如 DeepSeek 等）目前非常繁忙、暂时宕机或达到了免费额度限制。建议稍后重试，或尝试添加其他可用模型（例如更换为非 free 的模型或换用 DeepSeek/MiniMax 官方供应商）。"
      }
      return NextResponse.json(
        { error: errMsg },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, message: "API 连接成功" })
  } catch (error) {
    console.error("LLM API test error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API 测试失败" },
      { status: 500 }
    )
  }
}