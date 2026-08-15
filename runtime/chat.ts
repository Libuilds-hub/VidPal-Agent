// runtime/chat.ts —— Agent 聊天：POST /chat 的 SSE 流（可注入 agent 工厂以便测试）
import { AIMessageChunk, ToolMessage, type BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages"

export interface ChatServices {
  /** 构建（或取缓存）Agent；model/provider 为可选的 LLM 覆盖 */
  getAgent(model?: string, provider?: string): Promise<{
    stream(
      input: { messages: BaseMessage[] },
      opts: { streamMode: string; recursionLimit: number; signal?: AbortSignal }
    ): AsyncIterable<unknown>
  }>
}

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>
  model?: string
  provider?: string
  skills?: string[]
}

/** 把 LangGraph messages 流映射为 SSE 事件（与旧 /api/chat 契约一致） */
export async function mapAgentStreamToSSE(
  stream: AsyncIterable<unknown>,
  onEvent: (event: string, data: unknown) => void
): Promise<void> {
  for await (const chunk of stream) {
    const [msg] = chunk as [BaseMessage]
    if (msg instanceof AIMessageChunk) {
      const content = msg.content
      if (content && typeof content === "string" && content.length > 0) {
        onEvent("token", { content })
      }
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          if (tc.name) onEvent("tool_start", { name: tc.name, args: tc.args })
        }
      }
    }
    if (msg instanceof ToolMessage) {
      onEvent("tool_end", {
        name: msg.name,
        result: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      })
    }
  }
  onEvent("done", {})
}

export function messagesFromRequest(body: Pick<ChatRequest, "messages">): BaseMessage[] {
  return body.messages.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  )
}

/** 供测试与 server 共用的工厂（保持单一入口） */
export function createChatHandler(services: ChatServices) {
  return {
    services,
    /** 执行一次聊天，返回 SSE 事件数组（测试用）或经 onEvent 推送（server 用）。
     *  signal 透传给 LangGraph stream 配置（RunnableConfig.signal）：客户端断线时
     *  abort，ReAct 循环与 LLM 流立即停止，避免孤儿运行消耗 token。 */
    async run(
      body: ChatRequest,
      onEvent: (event: string, data: unknown) => void,
      signal?: AbortSignal
    ): Promise<void> {
      const agent = await services.getAgent(body.model, body.provider)
      const stream = await agent.stream(
        { messages: messagesFromRequest(body) },
        { streamMode: "messages", recursionLimit: 25, ...(signal ? { signal } : {}) }
      )
      await mapAgentStreamToSSE(stream, onEvent)
    },
  }
}
