// runtime/tests/server.test.ts —— 起真实 HTTP 服务（端口 0）做集成测试
import { test } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
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

/** 裸 node:http 客户端：可精确控制 Connection 语义（fetch 无法做到），
 *  收集 statusCode + headers + body；超时 5s 避免挂起拖死测试。
 *  opts.waitForClose：响应 end 后是否等待客户端 socket 观察到 close（服务端
 *  主动关闭/销毁连接时 true）——用于验证 413 后连接不被 keep-alive 复用。 */
function rawRequest(
  base: string,
  path: string,
  method: string,
  headers: Record<string, string>,
  body: string,
  opts?: { agent?: http.Agent; waitForClose?: boolean }
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string; socketClosed: boolean }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base)
    const req = http.request(
      {
        host: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers,
        agent: opts?.agent,
      },
      (res) => {
        const chunks: Buffer[] = []
        let socketClosed = false
        const socket = res.socket
        socket?.on("close", () => {
          socketClosed = true
        })
        res.on("data", (c: Buffer) => chunks.push(c))
        res.on("end", () => {
          const payload = {
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf-8"),
          }
          if (opts?.waitForClose && socket && !socketClosed) {
            // 服务端销毁 socket 的 FIN 可能晚于响应 end 到达：短暂等待 close
            let done = false
            const settle = () => {
              if (!done) {
                done = true
                resolve({ ...payload, socketClosed })
              }
            }
            socket.once("close", () => {
              socketClosed = true
              settle()
            })
            const t = setTimeout(settle, 1500)
            socket.once("close", () => clearTimeout(t))
          } else {
            resolve({ ...payload, socketClosed })
          }
        })
      }
    )
    req.on("error", (err) => reject(err))
    req.setTimeout(5000, () => req.destroy(new Error("request timed out")))
    req.end(body)
  })
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
    // SSE 帧应携带 id 行（spec 兼容，支持 Last-Event-ID 断线续传）
    assert.match(sseText, /^id: \d+$/m)
    // SSE 帧 data 应携带服务端真实 createdAt（客户端不再伪造时间戳）
    assert.match(sseText, /"createdAt":\d+/)
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

test("GET /tasks/:id 对不存在的任务返回 404", async () => {
  const { server, base } = startTestServer()
  try {
    const res = await fetch(`${base}/tasks/no-such-task-id`)
    assert.equal(res.status, 404)
    const body = (await res.json()) as { error: string }
    assert.equal(body.error, "任务不存在")
  } finally {
    server.close()
  }
})

test("多字节 body 保真：中文输入原样回显（跨 chunk 边界不产生 U+FFFD）", async () => {
  const { server, db, base } = startTestServer()
  try {
    // 旧实现 readBody 用 raw += chunk 逐块解码，中文多字节字符若跨 chunk 边界
    // 会被损坏成 U+FFFD；这里把 body 撑到 ~540KB 纯中文，保证多个 chunk 边界
    // 必然落在中文字符内部，能稳定复现该缺陷（780KB 中文 body 曾实测损坏）。
    const msg = "你好，世界测试编码"
    const body = JSON.stringify({ type: "echo", input: { message: msg.repeat(20000) } })
    const res = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    assert.equal(res.status, 200)
    const created = (await res.json()) as { taskId: string }

    // 等任务跑完（worker 未启动，手动跑一次）
    await new TaskQueue(db, new TaskEventBus(db), [echoHandler]).runTaskById(created.taskId)

    const detail = (await (await fetch(`${base}/tasks/${created.taskId}`)).json()) as {
      status: string
      result: string
    }
    assert.equal(detail.status, "done")
    const echoed = JSON.parse(detail.result) as string
    assert.equal(echoed, msg.repeat(20000))
    assert.ok(!echoed.includes("\uFFFD"), "回显内容不应包含替换字符 U+FFFD")
  } finally {
    server.close()
  }
})

test("会话：POST /sessions 传入非法类型 title 返回 400", async () => {
  const { server, base } = startTestServer()
  try {
    // 合法 JSON 但 schema 校验失败（title 不是 string）→ 400，不允许创建垃圾会话
    const res = await fetch(`${base}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: 123 }),
    })
    assert.equal(res.status, 400)
    const body = (await res.json()) as { error: string }
    assert.equal(body.error, "参数不合法")

    // 非对象（"abc"）同样拒绝
    const res2 = await fetch(`${base}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("abc"),
    })
    assert.equal(res2.status, 400)
  } finally {
    server.close()
  }
})

test("DB 异常时请求返回 500 且进程存活（全局兜底，不崩溃进程）", async () => {
  const { server, db, base } = startTestServer()
  try {
    // 关闭 DB 后，GET /tasks 的 db 查询会抛错；旧实现 async handler 拒绝
    // → unhandled rejection → 进程崩溃（客户端收不到任何响应，连接挂起）
    db.close()
    const res = await fetch(`${base}/tasks`, { signal: AbortSignal.timeout(5000) })
    assert.equal(res.status, 500)
    const body = (await res.json()) as { error: string }
    assert.equal(body.error, "服务器内部错误")

    // 进程存活：不触碰 DB 的路由仍正常响应
    const ok = await fetch(`${base}/skills`)
    assert.equal(ok.status, 200)
  } finally {
    server.close()
  }
})

test("请求体过大：413 显式 Connection: close，连接不被毒化", async () => {
  // 回归测试：readBody 在 1MB 处 reject 后，未读的请求体残留在连接上。
  // 旧实现 413 响应不关闭连接（注释误称“Node 自行关闭连接”，实际 Node 不会），
  // keep-alive 连接被未读 body 毒化 —— 同一连接的下一个请求可能无限挂起
  // （实测 7/15 复现），且 413 有时到不了客户端。
  // 修复后：413 路径显式回 Connection: close，并在响应冲刷完成后销毁 socket，
  // 从根上杜绝连接复用，毒化场景不再可能发生。
  // 这里用裸 node:http 客户端（而非 fetch）精确控制连接语义：
  // 1) 客户端显式 Connection: close 的 >1MB 请求 → 必须拿到 413 + connection: close；
  // 2) 之后用全新连接发小请求 → 200，证明服务未因超限 body 而损坏；
  // 3) 决定性断言：keep-alive 连接上客户端未发 Connection: close，服务端 413
  //    仍必须显式回 connection: close 并销毁 socket（旧实现回 keep-alive 且
  //    连接保持打开 → 本断言必挂）。
  const { server, base } = startTestServer()
  try {
    const bigBody = JSON.stringify({ type: "echo", input: { message: "x".repeat(1_100_000) } })
    assert.ok(Buffer.byteLength(bigBody) > 1_000_000, "测试 body 必须超过 1MB 阈值")

    // 1) 客户端显式 Connection: close
    const big = await rawRequest(base, "/tasks", "POST", {
      "Content-Type": "application/json",
      Connection: "close",
    }, bigBody)
    assert.equal(big.statusCode, 413)
    assert.equal((big.headers["connection"] ?? "").toLowerCase(), "close")

    // 2) 全新连接上的后续请求必须正常服务（毒化被 Connection: close + destroy 阻断）
    const small = await rawRequest(base, "/tasks", "POST", {
      "Content-Type": "application/json",
    }, JSON.stringify({ type: "echo", input: { message: "hi" } }))
    assert.equal(small.statusCode, 200)
    assert.equal(JSON.parse(small.body).error, undefined)

    // 3) keep-alive 连接（客户端不发 Connection: close）：413 也必须显式
    //    connection: close 并销毁 socket，防止连接被毒化复用
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    try {
      const alive = await rawRequest(base, "/tasks", "POST", {
        "Content-Type": "application/json",
      }, bigBody, { agent, waitForClose: true })
      assert.equal(alive.statusCode, 413)
      assert.equal((alive.headers["connection"] ?? "").toLowerCase(), "close")
      assert.ok(alive.socketClosed, "413 后服务端必须主动销毁 socket，禁止 keep-alive 复用")
    } finally {
      agent.destroy()
    }
  } finally {
    server.close()
  }
})

test("runtime-client 提交任务并轮询到 done", async () => {
  const { server, db, base } = startTestServer()
  try {
    // 模拟 Web 侧使用：直接注入 base URL
    const { createRuntimeClient } = await import("../../lib/runtime-client")
    const client = createRuntimeClient(base)
    const { taskId } = await client.submitTask({ type: "echo", input: { message: "客户端", delayMs: 5 } })

    // 手动执行（测试环境 worker 未启动）
    await new TaskQueue(db, new TaskEventBus(db), [echoHandler]).runTaskById(taskId)

    const task = await client.getTask(taskId)
    assert.equal(task.status, "done")
    assert.equal(task.result, '"客户端"')

    // listSessions 返回 camelCase SessionRow
    await client.createSession("测试会话")
    const sessions = await client.listSessions()
    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].title, "测试会话")
    assert.ok("createdAt" in sessions[0])
  } finally {
    server.close()
  }
})

test("runtime-client：baseUrl 带尾斜杠也能正常工作", async () => {
  const { server, base } = startTestServer()
  try {
    // 回归测试：baseUrl 以 "/" 结尾时，旧实现拼出 "//tasks" 导致所有请求 404。
    // 修复后工厂内部归一化 root，全部 URL 从 root 拼接，baseUrl 属性返回归一化结果。
    const { createRuntimeClient } = await import("../../lib/runtime-client")
    const client = createRuntimeClient(`${base}/`)
    assert.equal(client.baseUrl, base, "baseUrl 属性应返回归一化（无尾斜杠）的 root")
    const created = await client.submitTask({ type: "echo", input: { message: "尾斜杠" } })
    assert.ok(created.taskId, "提交任务应成功返回 taskId")
  } finally {
    server.close()
  }
})

test("runtime-client：取消不存在的任务返回 { ok: false } 而非抛错", async () => {
  const { server, base } = startTestServer()
  try {
    // 回归测试：服务端对不存在的任务返回 404 {"ok": false}，旧实现 request()
    // 对 !res.ok 一律抛错，导致 cancelTask 永远无法解析为 { ok: false }。
    const { createRuntimeClient } = await import("../../lib/runtime-client")
    const client = createRuntimeClient(base)
    const result = await client.cancelTask("no-such-task-id")
    assert.deepEqual(result, { ok: false })
  } finally {
    server.close()
  }
})

test("LLM 缓存清除端点返回 ok", async () => {
  const { server, base } = startTestServer()
  try {
    const res = await fetch(`${base}/llm/cache/clear`, { method: "POST" })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { ok: boolean }
    assert.equal(body.ok, true)
  } finally {
    server.close()
  }
})
