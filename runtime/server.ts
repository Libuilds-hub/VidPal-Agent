// runtime/server.ts —— 原生 node:http 迷你路由 + CORS + SSE
import http from "node:http"
import { z } from "zod"
import type { RuntimeDb } from "./db"
import type { TaskEventBus } from "./events"
import type { TaskQueue } from "./tasks/queue"
import type { CreateTaskRequest, SessionRow } from "./shared/types"
import type { ChatServices } from "./chat"
import { SKILLS_ROOT } from "./skills/registry"

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
  chat?: ChatServices
  /** 工具索引（GET /tools 输出），未传则端点返回空数组 */
  toolsIndex?: Array<{ name: string; description: string; dangerous: boolean }>
  /** 技能目录根（测试注入 tmp；默认项目 skills/） */
  skillsRoot?: string
}

export function createRuntimeServer(services: RuntimeServices): http.Server {
  const { db, bus, queue } = services
  const skillsRoot = services.skillsRoot ?? SKILLS_ROOT

  function cors(res: http.ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
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

  /** 原始二进制 body（技能 ZIP 上传用）；超限拒绝并 pause（与 readBody 相同的 413 路径） */
  function readRawBody(req: http.IncomingMessage, limit: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      let total = 0
      req.on("data", (chunk: Buffer) => {
        total += chunk.length
        if (total > limit) {
          reject(new Error("body too large"))
          req.pause()
          return
        }
        chunks.push(chunk)
      })
      req.on("end", () => resolve(Buffer.concat(chunks)))
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
      const type = url.searchParams.get("type") ?? undefined
      json(res, 200, queue.listTasks(sessionId, type))
      return
    }

    const taskMatch = path.match(/^\/tasks\/([^/]+)$/)
    const cancelMatch = path.match(/^\/tasks\/([^/]+)\/cancel$/)
    const retryMatch = path.match(/^\/tasks\/([^/]+)\/retry$/)
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

    if (method === "POST" && retryMatch) {
      const result = queue.retryTask(retryMatch[1])
      if (!result) {
        json(res, 400, { error: "任务不存在或仍在运行中，无法重试" })
        return
      }
      json(res, 200, { taskId: result.taskId, reused: false, status: "pending" })
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
      // Agent 缓存持有旧 apiKey/baseUrl/model 的 ChatOpenAI 实例，必须一并清空。
      // 注意不能动态导入 ./index（进程入口，导入会创建 db / 启动服务器）——
      // 缓存已独立到 ./agent/cache 这个无副作用的小模块。
      const { clearAgentCache } = await import("./agent/cache")
      clearAgentCache()
      json(res, 200, { ok: true })
      return
    }

    // ---- 聊天 ----
    if (method === "POST" && path === "/chat") {
      if (!services.chat) {
        json(res, 503, { error: "聊天服务未配置" })
        return
      }
      // 客户端断线（SSE 流中途）时中止 Agent 运行：否则 ReAct 循环 + LLM 流会
      // 一直跑到结束（孤儿工作 + token 消耗）。LangGraph 支持在 stream 配置里传
      // signal（RunnableConfig.signal），abort 后运行循环立即停止。
      // 注意不能用 req.on("close")：POST 带 body 时 Node 在请求体读完（消息完成）
      // 就触发该事件（parserOnMessageComplete → stream.push(null)），会在 Agent
      // 启动前就 abort 掉本次运行；events 路由（GET 无 body）用 req close 没问题，
      // 因为那种请求只有 socket 关闭才触发。res 'close' 仅在响应完成或连接提前
      // 终止时触发：断线 → abort 停止 Agent；正常收尾（run 已返回）→ abort 无副作用。
      const controller = new AbortController()
      res.on("close", () => controller.abort())
      try {
        const raw = (await readBody(req)) as { messages?: unknown }
        if (!Array.isArray(raw.messages)) {
          json(res, 400, { error: "messages 数组是必填项" })
          return
        }
        const { createChatHandler } = await import("./chat")
        const { LLMNotConfiguredError } = await import("./llm")
        cors(res)
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        })
        const send = (event: string, data: unknown) => sendSSE(res, event, data)
        try {
          await createChatHandler(services.chat).run(raw as never, send, controller.signal)
        } catch (err) {
          if (err instanceof LLMNotConfiguredError) {
            send("error", { message: "AI 模型未配置，请先在设置页配置 LLM API Key。", code: "NOT_CONFIGURED" })
          } else {
            console.error("[runtime] 聊天错误:", err)
            send("error", { message: err instanceof Error ? err.message : "AI 服务暂不可用", code: "UNKNOWN" })
          }
        }
        res.end()
      } catch (err) {
        // 与 /tasks、/sessions 一致：readBody 已知错误（413 请求体过大 / 400 非法
        // JSON）由 sendBodyError 处理并关闭被污染的连接；未知错误交给全局兜底（500）
        if (!sendBodyError(req, res, err)) throw err
      }
      return
    }

    // ---- 技能 ----
    if (method === "GET" && path === "/skills") {
      const { scanSkillsDir } = await import("./skills/registry")
      json(res, 200, scanSkillsDir(skillsRoot))
      return
    }

    // ---- 技能管理（设置页：精选安装 / ZIP 上传 / 卸载）----
    // 注意：三个精确路径分支必须在此、在 skillsMatch 正则分支之前
    if (method === "GET" && path === "/skills/catalog") {
      const { catalogSkills } = await import("./skills/install")
      json(res, 200, catalogSkills(skillsRoot))
      return
    }

    if (method === "POST" && path === "/skills/install") {
      try {
        const parsed = z.object({ name: z.string().min(1) }).safeParse(await readBody(req))
        if (!parsed.success) {
          json(res, 400, { error: "参数不合法" })
          return
        }
        const { installCuratedSkill, SkillError } = await import("./skills/install")
        try {
          json(res, 200, installCuratedSkill(skillsRoot, parsed.data.name))
        } catch (err) {
          if (err instanceof SkillError) json(res, err.status, { error: err.message })
          else throw err
        }
      } catch (err) {
        if (!sendBodyError(req, res, err)) throw err
      }
      return
    }

    if (method === "POST" && path === "/skills/upload") {
      try {
        const { uploadSkillZip, SkillError, MAX_ZIP_BYTES } = await import("./skills/install")
        const buf = await readRawBody(req, MAX_ZIP_BYTES)
        try {
          json(res, 200, await uploadSkillZip(skillsRoot, buf))
        } catch (err) {
          if (err instanceof SkillError) json(res, err.status, { error: err.message })
          else throw err
        }
      } catch (err) {
        if (!sendBodyError(req, res, err)) throw err
      }
      return
    }

    const skillsMatch = path.match(/^\/skills\/([^/]+)$/)

    if ((method === "GET" || method === "POST") && skillsMatch) {
      const { loadSkill, scanSkillsDir } = await import("./skills/registry")
      let name: string
      try {
        name = decodeURIComponent(skillsMatch[1])
      } catch {
        // 畸形百分号编码（URIError）→ 当作技能不存在，不给 500
        json(res, 404, { error: "技能不存在" })
        return
      }
      const content = loadSkill(skillsRoot, name)
      if (!content) {
        json(res, 404, { error: "技能不存在" })
        return
      }
      // 元数据从索引取（索引键 = 目录名，与装载键一致）
      const meta = scanSkillsDir(skillsRoot).find((e) => e.name === name)
      json(res, 200, {
        name,
        content,
        version: meta?.version ?? "0.0.0",
        description: meta?.description ?? "",
      })
      return
    }

    if (method === "DELETE" && skillsMatch) {
      let name: string
      try {
        name = decodeURIComponent(skillsMatch[1])
      } catch {
        json(res, 404, { error: "技能不存在" })
        return
      }
      const { deleteSkill, SkillError } = await import("./skills/install")
      try {
        deleteSkill(skillsRoot, name)
        json(res, 200, { ok: true })
      } catch (err) {
        if (err instanceof SkillError) json(res, err.status, { error: err.message })
        else throw err
      }
      return
    }

    // ---- 工具索引（控制台 dangerous 高亮用）----
    if (method === "GET" && path === "/tools") {
      json(res, 200, services.toolsIndex ?? [])
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
