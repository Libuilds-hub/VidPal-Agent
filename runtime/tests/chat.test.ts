// runtime/tests/chat.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { z } from "zod"
import { AIMessageChunk } from "@langchain/core/messages"
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
import { LLMNotConfiguredError } from "../llm"
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

test("POST /chat：请求体超过 1MB 返回 413（连接不被毒化）", async () => {
  // 回归测试：旧实现把 readBody 的一切失败都兜成 400，>1MB 的请求体被 reject 后
  // 仍残留在连接上（keep-alive 连接被毒化，下一个请求挂起）。修复后与 /tasks、
  // /sessions 一致走 sendBodyError：413 + Connection: close + 排空后销毁 socket。
  // 连接毒化防护本身由 server.test.ts 的 sendBodyError 测试覆盖，这里用 fetch
  // 简单断言状态码 413 即可。
  const { server, base } = startTestServer()
  try {
    const bigBody = JSON.stringify({
      messages: [{ role: "user", content: "x".repeat(1_100_000) }],
    })
    assert.ok(Buffer.byteLength(bigBody) > 1_000_000, "测试 body 必须超过 1MB 阈值")
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bigBody,
    })
    assert.equal(res.status, 413)
  } finally {
    server.close()
  }
})

test("POST /chat：LLM 未配置时 SSE 输出 error 事件（code NOT_CONFIGURED）", async () => {
  // 服务端应在 SSE 流里输出 event: error + code NOT_CONFIGURED（而非 500/UNKNOWN），
  // Web 侧据此引导用户去设置页配置 LLM。
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])
  const chat: ChatServices = {
    async getAgent() {
      throw new LLMNotConfiguredError()
    },
  }
  const server = createRuntimeServer({ db, bus, queue, chat })
  server.listen(0)
  const port = (server.address() as AddressInfo).port
  const base = `http://127.0.0.1:${port}`
  try {
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
    })
    assert.equal(res.status, 200)
    assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/)
    const text = await res.text()
    assert.match(text, /event: error/)
    assert.match(text, /NOT_CONFIGURED/)
  } finally {
    server.close()
  }
})

test("POST /chat：客户端断线后 Agent 流被 abort 停止（不跑满循环）", async () => {
  // 回归测试：旧实现无任何断线处理，客户端中途断开后 ReAct 循环 + LLM 流仍跑完
  // （孤儿工作 + token 消耗）。修复后服务端把 AbortSignal 透传给 agent.stream
  // （LangGraph RunnableConfig.signal），断线 → abort → 流迭代立即停止。
  // 注意服务端用的是 res 'close'（连接提前终止）而非 req 'close'：POST 带 body 时
  // req 'close' 在请求体读完即触发，会在 Agent 启动前就 abort（见 server.ts 注释）。
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])
  let receivedSignal: AbortSignal | undefined
  let abortedDuringStream = false
  const chat: ChatServices = {
    async getAgent() {
      return {
        async *stream(
          _input: { messages: unknown },
          opts: { streamMode: string; recursionLimit: number; signal?: AbortSignal }
        ): AsyncIterable<unknown> {
          receivedSignal = opts.signal
          // 模拟一个跑不完的 ReAct 循环（500 步 × 5ms ≈ 2.5s）
          for (let i = 0; i < 500; i++) {
            if (opts.signal?.aborted) {
              abortedDuringStream = true
              throw new DOMException("Aborted", "AbortError")
            }
            yield [new AIMessageChunk({ content: `token-${i}` })]
            await new Promise((r) => setTimeout(r, 5))
          }
        },
      } as never
    },
  }
  const server = createRuntimeServer({ db, bus, queue, chat })
  server.listen(0)
  const port = (server.address() as AddressInfo).port
  const base = `http://127.0.0.1:${port}`
  try {
    const ac = new AbortController()
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      signal: ac.signal,
    })
    assert.equal(res.status, 200)
    let text = ""
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      if (text.includes("event: token")) {
        ac.abort() // 客户端断线
        break
      }
    }
    assert.ok(receivedSignal, "run 必须把 AbortSignal 透传给 agent.stream")
    // 断线后服务端循环应被 abort 中断：断线信号经 socket → res 'close' →
    // controller.abort() 传播需要几个毫秒，这里轮询等待（有界 1s）。
    // 500 步 × 5ms 的循环不可能在客户端收到首个 token 之前自然跑完，
    // abortedDuringStream 始终为 false 即回归。
    const deadline = Date.now() + 1000
    while (!abortedDuringStream && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10))
    }
    assert.ok(abortedDuringStream, "agent stream 应观察到 abort 并停止迭代")
  } finally {
    server.close()
  }
})
