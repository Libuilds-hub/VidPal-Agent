// runtime/tests/fakes.ts —— 测试共享假件：可编程的 tool-calling chat model
// （C1/C4 共用：agent-builder 与 chat 测试都靠它驱动"先工具调用、后最终回答"的流程）
import { BaseChatModel, type BaseChatModelParams } from "@langchain/core/language_models/chat_models"
import { AIMessageChunk } from "@langchain/core/messages"
import type { ChatResult } from "@langchain/core/outputs"

export interface FakeToolResponse {
  role: "assistant"
  content: string
  tool_calls?: Array<{ name: string; args: Record<string, unknown> }>
}

/** 顺序消费 responses 的假模型：第一轮可发 tool_calls，第二轮给最终文本 */
export class FakeToolCallingChatModel extends BaseChatModel {
  private responses: FakeToolResponse[]
  private index = 0

  constructor(responses: FakeToolResponse[], params?: BaseChatModelParams) {
    super(params ?? {})
    this.responses = responses
  }

  _llmType(): string {
    return "fake-tool-calling"
  }

  override bindTools(): this {
    return this
  }

  async _generate(): Promise<ChatResult> {
    const resp = this.responses[Math.min(this.index, this.responses.length - 1)]
    this.index++
    const toolCalls = (resp.tool_calls ?? []).map((tc, i) => ({
      name: tc.name,
      args: tc.args,
      id: `call_${this.index}_${i}`,
      type: "tool_call" as const,
    }))
    const message = new AIMessageChunk({
      content: resp.content,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    })
    return { generations: [{ message, text: resp.content }] }
  }
}
