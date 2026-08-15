// runtime/tests/chat.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { z } from "zod"
import { createRuntimeDb } from "../db"
import { TaskEventBus } from "../events"
import { TaskQueue } from "../tasks/queue"
import { echoHandler } from "../tasks/echo"
import { ToolRegistry } from "../tools/registry"
import { langchainToolsFromRegistry } from "../agent/langchain-adapter"
import { buildAgent } from "../agent/builder"
import { createChatHandler, type ChatServices } from "../chat"
import { createRuntimeServer } from "../server"
import { FakeToolCallingChatModel } from "./fakes"
import type { AddressInfo } from "node:net"

function startTestServer() {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])
  const registry = new ToolRegistry()
  registry.register({
    name: "add",
    description: "add two numbers",
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    dangerous: false,
    async execute(args: { a: number; b: number }) {
      return { summary: String(args.a + args.b) }
    },
  })
  const model = new FakeToolCallingChatModel([
    { role: "assistant", content: "", tool_calls: [{ name: "add", args: { a: 1, b: 2 } }] },
    { role: "assistant", content: "答案是 3" },
  ])
  const chat: ChatServices = {
    async getAgent() {
      return buildAgent({
        llm: model,
        tools: langchainToolsFromRegistry(registry),
        systemPrompt: "你是计算器助手。",
      }) as never
    },
  }
  const server = createRuntimeServer({ db, bus, queue, chat })
  server.listen(0)
  const port = (server.address() as AddressInfo).port
  return { server, base: `http://127.0.0.1:${port}` }
}

test("POST /chat：SSE 全流程（token/tool_start/tool_end/done）", async () => {
  const { server, base } = startTestServer()
  try {
    const ac = new AbortController()
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "1+2=?" }] }),
      signal: ac.signal,
    })
    assert.equal(res.status, 200)
    assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/)
    let text = ""
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      if (text.includes("event: done")) {
        ac.abort()
        break
      }
    }
    assert.match(text, /event: tool_start/)
    assert.match(text, /event: tool_end/)
    assert.match(text, /event: token/)
    assert.match(text, /event: done/)
    assert.doesNotMatch(text, /event: error/)
    // 加强断言：tool_end 携带结果与工具名
    assert.match(text, /event: tool_end[\s\S]*?"result":"3"/)
  } finally {
    server.close()
  }
})

test("POST /chat：非法入参 400", async () => {
  const { server, base } = startTestServer()
  try {
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: "not-an-array" }),
    })
    assert.equal(res.status, 400)
  } finally {
    server.close()
  }
})
