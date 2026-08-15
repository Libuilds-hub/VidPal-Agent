// runtime/tests/agent-builder.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { z } from "zod"
import { ToolRegistry, type AgentTool } from "../tools/registry"
import { langchainToolsFromRegistry } from "../agent/langchain-adapter"
import { buildAgent, systemPromptWithSkills } from "../agent/builder"
import { HumanMessage } from "@langchain/core/messages"
import { AIMessageChunk, ToolMessage, type BaseMessage } from "@langchain/core/messages"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base"
import type { ChatResult } from "@langchain/core/outputs"
import type { Runnable } from "@langchain/core/runnables"

// 注意：@langchain/core@1.1.48 的 utils/testing 没有 FakeToolCallingChatModel
// （只有 FakeChatModel / FakeListChatModel / FakeStreamingChatModel，且其 _generate
// 不按调用次数推进响应队列、不支持 tool_calls 响应序列）。
// 因此本测试文件内定义等价假模型：responses 顺序消费，第一轮返回工具调用、第二轮返回最终文本。

interface FakeToolCallResponse {
  role: "assistant"
  content: string
  tool_calls?: Array<{ name: string; args: Record<string, unknown> }>
}

class FakeToolCallingChatModel extends BaseChatModel {
  responses: FakeToolCallResponse[]
  private i = 0

  constructor(params: { responses: FakeToolCallResponse[] }) {
    super({})
    this.responses = params.responses
  }

  _llmType(): string {
    return "fake-tool-calling"
  }

  bindTools(): Runnable<BaseLanguageModelInput, AIMessageChunk, BaseChatModel["ParsedCallOptions"]> {
    // createReactAgent 要求模型可 bindTools；假模型直接返回自身（响应队列不变）
    return this
  }

  async _generate(_messages: BaseMessage[]): Promise<ChatResult> {
    const resp = this.responses[Math.min(this.i, this.responses.length - 1)]
    this.i += 1
    const toolCalls = resp.tool_calls?.map((tc, idx) => ({
      name: tc.name,
      args: tc.args,
      id: `call_${this.i}_${idx}`,
      type: "tool_call" as const,
    }))
    return {
      generations: [
        {
          message: new AIMessageChunk({ content: resp.content, tool_calls: toolCalls }),
          text: resp.content,
        },
      ],
    }
  }
}

test("langchainToolsFromRegistry：注册表工具包装为 LangChain 工具并执行", async () => {
  const registry = new ToolRegistry()
  const schema = z.object({ a: z.number(), b: z.number() })
  const addTool: AgentTool<typeof schema> = {
    name: "add",
    description: "两个数相加",
    inputSchema: schema,
    dangerous: false,
    async execute(args) {
      return { summary: String(args.a + args.b) }
    },
  }
  registry.register(addTool)
  const tools = langchainToolsFromRegistry(registry)
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, "add")
  const result = await tools[0].invoke({ a: 1, b: 2 })
  assert.equal(result, "3")
})

test("systemPromptWithSkills：拼接技能内容", () => {
  const prompt = systemPromptWithSkills("你是助手。", [
    { name: "video-study", content: "## 视频学习\n规则：先搜索再确认。" },
  ])
  assert.match(prompt, /你是助手。/)
  assert.match(prompt, /## 技能: video-study/)
  assert.match(prompt, /先搜索再确认/)
})

test("buildAgent + 事件映射：工具调用全流程事件", async () => {
  const registry = new ToolRegistry()
  const schema = z.object({ a: z.number(), b: z.number() })
  const addTool: AgentTool<typeof schema> = {
    name: "add",
    description: "add two numbers",
    inputSchema: schema,
    dangerous: false,
    async execute(args) {
      return { summary: String(args.a + args.b) }
    },
  }
  registry.register(addTool)
  const model = new FakeToolCallingChatModel({
    responses: [
      {
        role: "assistant",
        content: "",
        tool_calls: [{ name: "add", args: { a: 1, b: 2 } }],
      },
      { role: "assistant", content: "结果是 3" },
    ],
  })
  const agent = buildAgent({ llm: model, tools: langchainToolsFromRegistry(registry), systemPrompt: "你是计算器助手。" })

  const events: Array<{ type: string; payload: Record<string, unknown> }> = []
  const stream = await agent.stream(
    { messages: [new HumanMessage("1+2=?")] },
    { streamMode: "messages", recursionLimit: 10 }
  )
  for await (const chunk of stream) {
    const [msg] = chunk as [BaseMessage]
    if (msg instanceof AIMessageChunk) {
      const content = msg.content
      if (content && typeof content === "string" && content.length > 0) {
        events.push({ type: "token", payload: { content } })
      }
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          if (tc.name) events.push({ type: "tool_start", payload: { name: tc.name, args: tc.args } })
        }
      }
    }
    if (msg instanceof ToolMessage) {
      events.push({
        type: "tool_end",
        payload: { name: msg.name, result: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) },
      })
    }
  }
  events.push({ type: "done", payload: {} })

  const types = events.map((e) => e.type)
  assert.ok(types.includes("tool_start"), "应发出 tool_start: " + JSON.stringify(types))
  assert.ok(types.includes("tool_end"), "应发出 tool_end")
  assert.ok(types.includes("token"), "应发出 token")
  assert.ok(types.includes("done"), "应发出 done")
  const toolStart = events.find((e) => e.type === "tool_start")!
  assert.equal((toolStart.payload as { name: string }).name, "add")
})
