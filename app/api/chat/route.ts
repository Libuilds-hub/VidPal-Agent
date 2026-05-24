// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server"
import { runAgent, LLMNotConfiguredError, HumanMessage, AIMessage } from "@/lib/agent"

export async function POST(req: NextRequest) {
  let body: { messages: Array<{ role: string; content: string }> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 })
  }

  const langchainMessages = body.messages.map((m) =>
    m.role === "user"
      ? new HumanMessage(m.content)
      : new AIMessage(m.content)
  )

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const events = await runAgent(langchainMessages)

        for await (const event of events) {
          // LLM streaming token
          if (event.event === "on_chat_model_stream") {
            const content = event.data?.chunk?.content
            if (content) {
              send("token", { content })
            }
          }

          // Tool call started
          if (event.event === "on_tool_start") {
            let args = event.data?.input
            // DynamicTool input is deeply nested { input: "{ input: \"{...}\" }" }, unwrap
            while (args && typeof args.input === "string") {
              try { args = JSON.parse(args.input) } catch { args = args.input; break }
            }
            send("tool_start", {
              name: event.name,
              args: args || {},
            })
          }

          // Tool call finished — extract content from ToolMessage
          if (event.event === "on_tool_end") {
            const output = event.data?.output
            const result = output?.content ?? output
            send("tool_end", {
              name: event.name,
              result: typeof result === "string" ? result : JSON.stringify(result),
            })
          }
        }

        send("done", {})
      } catch (error) {
        if (error instanceof LLMNotConfiguredError) {
          send("error", {
            message: "AI 模型未配置，请先在设置页配置 LLM API Key。",
            code: "NOT_CONFIGURED",
          })
        } else {
          console.error("Agent chat error:", error)
          send("error", {
            message: error instanceof Error ? error.message : "AI 服务暂不可用",
            code: "UNKNOWN",
          })
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
