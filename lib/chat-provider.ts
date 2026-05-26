import AbstractChatProvider from '@ant-design/x-sdk/es/chat-providers/AbstractChatProvider'
import type { XRequestOptions } from '@ant-design/x-sdk'
import type { SSEOutput } from '@ant-design/x-sdk'

export interface ChatMessage {
  role: string
  content: string
  thinking?: string
}

export interface ChatInput {
  messages: ChatMessage[]
  model?: string
}

export class ShancnChatProvider extends AbstractChatProvider<
  ChatMessage,
  ChatInput,
  SSEOutput
> {
  transformParams(
    requestParams: Partial<ChatInput>,
    options: XRequestOptions<ChatInput, SSEOutput>,
  ): ChatInput {
    return {
      messages:
        requestParams.messages ||
        options?.params?.messages ||
        [],
      model: requestParams.model || options?.params?.model,
    }
  }

  transformLocalMessage(requestParams: Partial<ChatInput>): ChatMessage {
    const msgs = (requestParams as ChatInput).messages
    return msgs?.[0] || { role: 'user', content: '' }
  }

  transformMessage(info: {
    originMessage?: ChatMessage
    chunk: SSEOutput
    chunks: SSEOutput[]
    status: string
    responseHeaders: Headers
  }): ChatMessage {
    const { chunk, originMessage, status } = info

    const parseData = (data: unknown): Record<string, unknown> => {
      if (typeof data === 'string') {
        try { return JSON.parse(data) } catch { return {} }
      }
      return (data as Record<string, unknown>) || {}
    }

    if (chunk?.event === 'token') {
      const data = parseData(chunk.data)
      if (data.content) {
        const prevContent = originMessage?.content || ''
        const prevThinking = (originMessage as ChatMessage)?.thinking || ''
        const full = prevContent + (data.content as string)

        // Extract thinking from <think>...</think> blocks, accumulated separately
        let thinking = prevThinking
        let visible = full
        const thinkMatch = full.match(/<think>([\s\S]*?)<\/think>/)
        if (thinkMatch) {
          thinking = thinkMatch[1]
          visible = full.replace(/<think>[\s\S]*?<\/think>/g, '')
        }
        // Trim leading whitespace in visible content
        visible = visible.replace(/^\s+/, '')

        return { role: 'assistant', content: visible, thinking }
      }
    }

    if (chunk?.event === 'error') {
      const data = parseData(chunk.data)
      return {
        role: 'assistant',
        content: (data.message as string) || '请求失败，请重试',
      }
    }

    // On final success, also clean up
    if (status === 'success' && originMessage) {
      const visible = originMessage.content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^\s+/, '')
      return { ...originMessage, content: visible }
    }

    return originMessage || { role: 'assistant', content: '' }
  }
}
