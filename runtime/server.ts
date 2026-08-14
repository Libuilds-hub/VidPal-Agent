// runtime/server.ts —— 原生 node:http 迷你路由 + CORS + SSE
import http from "node:http"
import { z } from "zod"
import type { RuntimeDb } from "./db"
import type { TaskEventBus } from "./events"
import type { TaskQueue } from "./tasks/queue"
import type { CreateTaskRequest, SessionRow } from "./shared/types"

const CreateTaskSchema = z.object({
  type: z.string().min(1),
  input: z.unknown().optional(),
  sessionId: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

const SessionSchema = z.object({
  title: z.string().optional(),
})

const HEARTBEAT_MS = 20_000

export interface RuntimeServices {
  db: RuntimeDb
  bus: TaskEventBus
  queue: TaskQueue
}

export function createRuntimeServer(services: RuntimeServices): http.Server {
  const { db, bus, queue } = services

  function cors(res: http.ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID")
  }

  function json(res: http.ServerResponse, status: number, data: unknown): void {
    cors(res)
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
    res.end(JSON.stringify(data))
  }

  function readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let raw = ""
      req.on("data", (chunk) => {
        raw += chunk
        if (raw.length > 1_000_000) reject(new Error("body too large"))
      })
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : {})
        } catch {
          reject(new Error("invalid JSON"))
        }
      })
      req.on("error", reject)
    })
  }

  function sendSSE(res: http.ServerResponse, event: string, data: unknown): void {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    } catch {
      // 客户端已断开（socket destroyed），忽略本次写入
    }
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost")
    const path = url.pathname
    const method = req.method ?? "GET"

    if (method === "OPTIONS") {
      cors(res)
      res.writeHead(204)
      res.end()
      return
    }

    // ---- 任务 ----
    if (method === "POST" && path === "/tasks") {
      try {
        const parsed = CreateTaskSchema.safeParse(await readBody(req))
        if (!parsed.success) {
          json(res, 400, { error: "参数不合法", details: parsed.error.flatten() })
          return
        }
        const body = parsed.data as CreateTaskRequest
        const result = queue.enqueue({
          type: body.type,
          input: body.input,
          sessionId: body.sessionId,
          idempotencyKey: body.idempotencyKey,
        })
        json(res, 200, result)
      } catch {
        json(res, 400, { error: "请求体不是合法 JSON" })
      }
      return
    }

    if (method === "GET" && path === "/tasks") {
      const sessionId = url.searchParams.get("sessionId") ?? undefined
      json(res, 200, queue.listTasks(sessionId))
      return
    }

    const taskMatch = path.match(/^\/tasks\/([^/]+)$/)
    const cancelMatch = path.match(/^\/tasks\/([^/]+)\/cancel$/)
    const eventsMatch = path.match(/^\/tasks\/([^/]+)\/events$/)

    if (method === "GET" && taskMatch) {
      const task = queue.getTask(taskMatch[1])
      if (!task) {
        json(res, 404, { error: "任务不存在" })
        return
      }
      json(res, 200, task)
      return
    }

    if (method === "POST" && cancelMatch) {
      const ok = queue.requestCancel(cancelMatch[1])
      json(res, ok ? 200 : 404, { ok })
      return
    }

    if (method === "GET" && eventsMatch) {
      const taskId = eventsMatch[1]
      const after = Number(url.searchParams.get("after") ?? req.headers["last-event-id"] ?? 0)
      cors(res)
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      })

      // 回放历史事件（评审修正 D：回放阶段逐条保护，防订阅者抛错中断回放）
      try {
        for (const ev of bus.replay(taskId, Number.isFinite(after) ? after : 0)) {
          sendSSE(res, ev.type, { ...(ev.payload as Record<string, unknown>), seq: ev.seq })
        }
      } catch {
        /* 回放失败不致命 */
      }

      const unsubscribe = bus.on(taskId, (ev) => {
        sendSSE(res, ev.type, { ...(ev.payload as Record<string, unknown>), seq: ev.seq })
      })

      const heartbeat = setInterval(() => {
        try {
          res.write(": ping\n\n")
        } catch {
          /* 客户端已断开 */
        }
      }, HEARTBEAT_MS)

      req.on("close", () => {
        clearInterval(heartbeat)
        unsubscribe()
      })
      return
    }

    // ---- 会话（评审修正 A：对外契约统一 camelCase SessionRow）----
    if (method === "POST" && path === "/sessions") {
      let parsed: ReturnType<typeof SessionSchema.safeParse>
      try {
        parsed = SessionSchema.safeParse(await readBody(req))
      } catch {
        json(res, 400, { error: "请求体不是合法 JSON" })
        return
      }
      const title = parsed.success ? (parsed.data.title ?? "新会话") : "新会话"
      const id = crypto.randomUUID()
      const now = Date.now()
      db.prepare("INSERT INTO session (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
        id,
        title,
        now,
        now
      )
      json(res, 200, { id, title })
      return
    }

    if (method === "GET" && path === "/sessions") {
      const rows = db
        .prepare("SELECT id, title, created_at, updated_at FROM session ORDER BY updated_at DESC")
        .all() as Array<{ id: string; title: string; created_at: number; updated_at: number }>
      const sessions: SessionRow[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
      json(res, 200, sessions)
      return
    }

    // ---- 技能（占位，P3 实现）----
    if (method === "GET" && path === "/skills") {
      json(res, 200, [])
      return
    }

    if (method === "POST" && path.startsWith("/skills/")) {
      json(res, 501, { error: "技能系统将在 P3 实现" })
      return
    }

    json(res, 404, { error: "not found" })
  })
}
