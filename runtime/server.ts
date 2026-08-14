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
      const chunks: Buffer[] = []
      let total = 0
      req.on("data", (chunk: Buffer) => {
        total += chunk.length
        if (total > 1_000_000) {
          reject(new Error("body too large"))
          // 暂停接收即可避免内存无限增长；但未读的请求体会残留在连接上，
          // Node 不会自动关闭连接 —— 413 路径必须显式 Connection: close 并在
          // 响应冲刷后销毁 socket（见 sendBodyError），否则 keep-alive 连接会被
          // 残留 body 毒化，下一个请求挂起/解析错乱。
          req.pause()
          return
        }
        chunks.push(chunk)
      })
      req.on("end", () => {
        try {
          // Buffer.concat 一次性解码：逐块 raw += chunk 会把跨 chunk 边界的
          // 多字节 UTF-8 字符损坏成 U+FFFD
          const raw = Buffer.concat(chunks).toString("utf-8")
          resolve(raw ? JSON.parse(raw) : {})
        } catch {
          reject(new Error("invalid JSON"))
        }
      })
      req.on("error", reject)
    })
  }

  /** readBody 已知错误的状态码：请求体过大 → 413，其余（非法 JSON）→ 400 */
  function bodyErrorStatus(err: unknown): number {
    return err instanceof Error && err.message === "body too large" ? 413 : 400
  }

  /** readBody 错误分类；未知错误返回 null，由外层全局兜底转成 500 */
  function bodyError(err: unknown): { status: number; error: string } | null {
    if (!(err instanceof Error)) return null
    if (err.message !== "body too large" && err.message !== "invalid JSON") return null
    const status = bodyErrorStatus(err)
    return { status, error: status === 413 ? "请求体过大" : "请求体不是合法 JSON" }
  }

  /** readBody 已知错误的响应。413（请求体过大）时必须显式 Connection: close，
   *  并在响应冲刷后排空残留请求体、销毁 socket：请求体未读完，残留 body 会毒化
   *  keep-alive 连接（同一连接的下一个请求挂起/解析错乱，且 413 有时无法送达
   *  客户端）；Node 不会自动关闭连接，必须显式处理。400（非法 JSON）请求体已
   *  读完，普通响应即可。返回是否已处理（false = 未知错误，由外层全局兜底转 500）。 */
  function sendBodyError(req: http.IncomingMessage, res: http.ServerResponse, err: unknown): boolean {
    const e = bodyError(err)
    if (!e) return false
    if (e.status === 413) {
      cors(res)
      res.setHeader("Connection", "close")
      res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" })
      // 响应冲刷完成后关闭连接。注意不能直接 destroy：请求体残留未读数据
      // （parser 已被 pause），直接 destroy 会因未读数据触发 RST，反而丢失 413。
      // 先 resume 排空已到达的请求体（内存有界、正常客户端瞬时完成），排空完成
      // 或超时后销毁 socket —— 连接被有意关闭，杜绝毒化后 keep-alive 复用。
      res.on("finish", () => {
        const socket = req.socket
        if (req.readableEnded) {
          socket?.destroy()
          return
        }
        req.resume()
        const destroy = () => socket?.destroy()
        req.once("end", destroy)
        const guard = setTimeout(destroy, 1500)
        guard.unref()
        socket?.once("close", () => clearTimeout(guard))
      })
      res.end(JSON.stringify({ error: e.error }))
    } else {
      json(res, e.status, { error: e.error })
    }
    return true
  }

  function sendSSE(res: http.ServerResponse, event: string, data: unknown, id?: number): void {
    try {
      if (id !== undefined) res.write(`id: ${id}\n`)
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    } catch {
      // 客户端已断开（socket destroyed），忽略本次写入
    }
  }

  async function dispatch(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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
      } catch (err) {
        if (!sendBodyError(req, res, err)) throw err // 未知错误交给全局兜底（500）
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
          sendSSE(
            res,
            ev.type,
            {
              ...(ev.payload as Record<string, unknown>),
              seq: ev.seq,
              createdAt: ev.createdAt,
            },
            ev.seq
          )
        }
      } catch {
        /* 回放失败不致命 */
      }

      const unsubscribe = bus.on(taskId, (ev) => {
        sendSSE(
          res,
          ev.type,
          {
            ...(ev.payload as Record<string, unknown>),
            seq: ev.seq,
            createdAt: ev.createdAt,
          },
          ev.seq
        )
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
      } catch (err) {
        if (!sendBodyError(req, res, err)) throw err // 未知错误交给全局兜底（500）
        return
      }
      // 合法 JSON 但 schema 校验失败（如 title 非 string、body 非对象）→ 400，
      // 不允许静默吞掉非法入参创建垃圾会话
      if (!parsed.success) {
        json(res, 400, { error: "参数不合法", details: parsed.error.flatten() })
        return
      }
      const title = parsed.data.title ?? "新会话"
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

    // ---- LLM 缓存（Web 设置变更后调用，避免跨进程缓存失效）----
    if (method === "POST" && path === "/llm/cache/clear") {
      const { clearLLMCache } = await import("./llm")
      clearLLMCache()
      json(res, 200, { ok: true })
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
  }

  // 全局兜底：任何路由抛错都不允许变成 unhandled rejection 崩溃进程，
  // 统一 500 + 日志；POST /tasks、POST /sessions 内的精确 4xx 判断优先。
  return http.createServer(async (req, res) => {
    try {
      await dispatch(req, res)
    } catch (err) {
      console.error("[runtime] 请求处理异常:", err)
      try {
        json(res, 500, { error: "服务器内部错误" })
      } catch {
        /* 响应已开始或客户端已断开 */
      }
    }
  })
}
