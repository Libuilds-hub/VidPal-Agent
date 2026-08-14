// runtime/tests/server.test.ts —— 起真实 HTTP 服务（端口 0）做集成测试
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRuntimeDb } from "../db"
import { TaskEventBus } from "../events"
import { TaskQueue } from "../tasks/queue"
import { echoHandler } from "../tasks/echo"
import { createRuntimeServer } from "../server"
import type { AddressInfo } from "node:net"

function startTestServer() {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])
  const server = createRuntimeServer({ db, bus, queue })
  server.listen(0)
  const port = (server.address() as AddressInfo).port
  return { server, db, port, base: `http://127.0.0.1:${port}` }
}

test("POST /tasks → GET /tasks/:id → SSE 事件流 → done", async () => {
  const { server, db, base } = startTestServer()
  try {
    const res = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "echo", input: { message: "你好", delayMs: 5 } }),
    })
    assert.equal(res.status, 200)
    const created = (await res.json()) as { taskId: string; reused: boolean }
    assert.equal(created.reused, false)

    // 等任务跑完（worker 未启动，手动跑一次）
    await new TaskQueue(db, new TaskEventBus(db), [echoHandler]).runTaskById(created.taskId)

    const detailRes = await fetch(`${base}/tasks/${created.taskId}`)
    const detail = (await detailRes.json()) as { status: string; result: string }
    assert.equal(detail.status, "done")
    assert.equal(detail.result, '"你好"')

    // SSE：连接后应回放全部事件（含 task_done）
    const ac = new AbortController()
    const sseRes = await fetch(`${base}/tasks/${created.taskId}/events`, { signal: ac.signal })
    assert.equal(sseRes.status, 200)
    assert.match(sseRes.headers.get("content-type") ?? "", /text\/event-stream/)
    let sseText = ""
    const reader = sseRes.body!.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      sseText += decoder.decode(value, { stream: true })
      if (sseText.includes("event: task_done")) {
        ac.abort()
        break
      }
    }
    assert.match(sseText, /event: task_started/)
    assert.match(sseText, /event: task_done/)
    assert.match(sseText, /event: stage/)
  } finally {
    server.close()
  }
})

test("幂等键：重复提交返回同一任务", async () => {
  const { server, base } = startTestServer()
  try {
    const body = JSON.stringify({ type: "echo", input: {}, idempotencyKey: "k1" })
    const a = await (await fetch(`${base}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body })).json() as { taskId: string }
    const b = await (await fetch(`${base}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body })).json() as { taskId: string; reused: boolean }
    assert.equal(a.taskId, b.taskId)
    assert.equal(b.reused, true)
  } finally {
    server.close()
  }
})

test("非法入参返回 400", async () => {
  const { server, base } = startTestServer()
  try {
    const res = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
  } finally {
    server.close()
  }
})

test("会话：POST /sessions 创建，GET /sessions 返回 camelCase", async () => {
  const { server, base } = startTestServer()
  try {
    const created = await (await fetch(`${base}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "我的会话" }),
    })).json() as { id: string; title: string }
    assert.ok(created.id)
    assert.equal(created.title, "我的会话")

    const list = await (await fetch(`${base}/sessions`)).json() as Array<{ id: string; title: string; createdAt: number }>
    assert.equal(list.length, 1)
    assert.equal(list[0].id, created.id)
    assert.equal(list[0].title, "我的会话")
    // 对外契约是 camelCase（与 shared/types.ts 的 SessionRow 一致），不允许出现 snake_case 字段
    assert.ok("createdAt" in list[0])
    assert.ok(!("created_at" in list[0]))
  } finally {
    server.close()
  }
})

test("会话：POST /sessions 非法 JSON 返回 400 且进程存活", async () => {
  const { server, base } = startTestServer()
  try {
    // 非法 JSON 不应触发未处理的 promise rejection 崩溃进程，而应返回 400
    const bad = await fetch(`${base}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    })
    assert.equal(bad.status, 400)
    const badBody = (await bad.json()) as { error: string }
    assert.equal(badBody.error, "请求体不是合法 JSON")

    // 进程存活：后续合法请求仍返回 200
    const ok = await fetch(`${base}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "崩溃后新会话" }),
    })
    assert.equal(ok.status, 200)
  } finally {
    server.close()
  }
})

test("取消：POST /tasks/:id/cancel 对 pending 任务生效", async () => {
  const { server, base } = startTestServer()
  try {
    const created = await (await fetch(`${base}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "echo", input: {}, idempotencyKey: "c1" }),
    })).json() as { taskId: string }

    const cancelRes = await fetch(`${base}/tasks/${created.taskId}/cancel`, { method: "POST" })
    assert.equal(cancelRes.status, 200)

    const task = await (await fetch(`${base}/tasks/${created.taskId}`)).json() as { status: string }
    assert.equal(task.status, "cancelled")
  } finally {
    server.close()
  }
})
