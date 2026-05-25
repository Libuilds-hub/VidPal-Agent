import AbstractChatProvider from '@ant-design/x-sdk/es/chat-providers/AbstractChatProvider'
import type { XRequestOptions } from '@ant-design/x-sdk'
import type { SSEOutput } from '@ant-design/x-sdk'

export interface ChatMessage {
  role: string
  content: string
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
    const { chunk, originMessage } = info

    if (chunk?.event === 'token' && chunk?.data?.content) {
      const prev = originMessage?.content || ''
      return { role: 'assistant', content: prev + chunk.data.content }
    }

    if (chunk?.event === 'error') {
      return {
        role: 'assistant',
        content: chunk.data?.message || '请求失败，请重试',
      }
    }

    return originMessage || { role: 'assistant', content: '' }
  }
}
