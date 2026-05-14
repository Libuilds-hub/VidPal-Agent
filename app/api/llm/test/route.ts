import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey, model } = await request.json()

    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "API 请求失败" },
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