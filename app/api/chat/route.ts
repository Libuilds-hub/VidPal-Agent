// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server"
import { runAgent, LLMNotConfiguredError, HumanMessage, AIMessage } from "@/lib/agent"
import { AIMessageChunk, ToolMessage, type BaseMessage } from "@langchain/core/messages"

export const dynamic = "force-dynamic"

type StreamChunk = [BaseMessage, Record<string, unknown>]

export async function POST(req: NextRequest) {
  let body: { messages: Array<{ role: string; content: string }>; model?: string; provider?: string }
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
        const messageStream = await runAgent(langchainMessages, body.model, body.provider)

        for await (const chunk of messageStream) {
          const [msg, metadata] = chunk as StreamChunk
          const nodeName = metadata?.langgraph_node as string | undefined

          // LLM streaming token from the "agent" node
          if (msg instanceof AIMessageChunk) {
            const content = msg.content
            if (content && typeof content === "string" && content.length > 0) {
              send("token", { content })
            }
            // Tool call requests from the LLM are also in AIMessageChunk
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              for (const tc of msg.tool_calls) {
                if (tc.name) {
                  send("tool_start", { name: tc.name, args: tc.args })
                }
              }
            }
          }

          // Tool result from the "tools" node
          if (msg instanceof ToolMessage) {
            const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
            send("tool_end", { name: msg.name, result: content })
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
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
