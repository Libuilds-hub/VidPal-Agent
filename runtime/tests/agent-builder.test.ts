// runtime/tests/agent-builder.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { z } from "zod"
import { ToolRegistry, type AgentTool } from "../tools/registry"
import { langchainToolsFromRegistry } from "../agent/langchain-adapter"
import { buildAgent, systemPromptWithSkills } from "../agent/builder"
import { HumanMessage } from "@langchain/core/messages"
import { AIMessageChunk, ToolMessage, type BaseMessage } from "@langchain/core/messages"
import { FakeToolCallingChatModel } from "./fakes"

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
  const model = new FakeToolCallingChatModel([
    {
      role: "assistant",
      content: "",
      tool_calls: [{ name: "add", args: { a: 1, b: 2 } }],
    },
    { role: "assistant", content: "结果是 3" },
  ])
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

  // 加强断言：tool_end 携带工具名与工具返回结果（summary 字符串）
  const toolEnd = events.find((e) => e.type === "tool_end")!
  assert.equal((toolEnd.payload as { name: string }).name, "add")
  assert.equal((toolEnd.payload as { result: string }).result, "3")

  // 加强断言：事件顺序 tool_start < tool_end < 最终 token
  const toolStartIdx = types.indexOf("tool_start")
  const toolEndIdx = types.indexOf("tool_end")
  const lastTokenIdx = types.lastIndexOf("token")
  assert.ok(toolStartIdx !== -1 && toolEndIdx !== -1 && lastTokenIdx !== -1)
  assert.ok(toolStartIdx < toolEndIdx, "tool_start 应早于 tool_end")
  assert.ok(toolEndIdx < lastTokenIdx, "tool_end 应早于最终 token")
})
