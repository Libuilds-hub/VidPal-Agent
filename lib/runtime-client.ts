// lib/runtime-client.ts —— Web 侧访问 Runtime 的封装（服务端 fetch + 浏览器 EventSource）
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  TaskRow,
  TaskEvent,
  SessionRow,
} from "@/runtime/shared/types"

const DEFAULT_URL = process.env.NEXT_PUBLIC_RUNTIME_URL || "http://localhost:3100"

export function createRuntimeClient(baseUrl: string = DEFAULT_URL) {
  // 归一化：去掉尾斜杠。否则 "http://localhost:3100/" 会拼出 "//tasks"，
  // 服务端按 path === "/tasks" 精确匹配 → 全部请求 404（SSE 静默失效）。
  const root = baseUrl.replace(/\/+$/, "")

  async function request<T>(
    path: string,
    init?: RequestInit,
    opts?: { allow?: number[] }
  ): Promise<T> {
    const method = init?.method ?? "GET"
    let res: Response
    try {
      res = await fetch(`${root}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        cache: "no-store",
      })
    } catch (err) {
      // 网络错误（runtime 未启动/连接被拒等）必须能识别，而不是裸 TypeError
      throw new Error(`Runtime 请求失败 (${method} ${path}): ${(err as Error).message}`, {
        cause: err,
      })
    }
    if (!res.ok) {
      // 白名单状态码：解析并返回 body 而非抛错。如取消不存在的任务
      // 服务端返回 404 {"ok": false}，cancelTask 应解析为 { ok: false }。
      if (opts?.allow?.includes(res.status)) {
        return res.json() as Promise<T>
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error || `Runtime 请求失败 (${method} ${path}): HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  return {
    baseUrl: root,
    submitTask(req: CreateTaskRequest): Promise<CreateTaskResponse> {
      return request("/tasks", { method: "POST", body: JSON.stringify(req) })
    },
    getTask(taskId: string): Promise<TaskRow> {
      return request(`/tasks/${encodeURIComponent(taskId)}`)
    },
    listTasks(sessionId?: string, type?: string): Promise<TaskRow[]> {
      const params: string[] = []
      if (sessionId) params.push(`sessionId=${encodeURIComponent(sessionId)}`)
      if (type) params.push(`type=${encodeURIComponent(type)}`)
      return request(`/tasks${params.length > 0 ? "?" + params.join("&") : ""}`)
    },
    cancelTask(taskId: string): Promise<{ ok: boolean }> {
      return request(
        `/tasks/${encodeURIComponent(taskId)}/cancel`,
        { method: "POST" },
        { allow: [404] }
      )
    },
    retryTask(taskId: string): Promise<{ taskId: string; reused: boolean; status: string }> {
      return request(`/tasks/${encodeURIComponent(taskId)}/retry`, { method: "POST" })
    },
    listTools(): Promise<Array<{ name: string; description: string; dangerous: boolean }>> {
      return request("/tools")
    },
    listSkills(): Promise<Array<{ name: string; description: string; version: string; default: boolean }>> {
      return request("/skills")
    },
    getSkill(name: string): Promise<{ name: string; content: string; version: string; description: string }> {
      return request(`/skills/${encodeURIComponent(name)}`)
    },
    createSession(title?: string): Promise<{ id: string; title: string }> {
      return request("/sessions", { method: "POST", body: JSON.stringify({ title }) })
    },
    listSessions(): Promise<SessionRow[]> {
      return request("/sessions")
    },
    /**
     * 订阅任务事件流。EventSource 断线会自动重连并携带 Last-Event-ID，
     * 服务端据此回放未消费事件。
     */
    subscribeTaskEvents(taskId: string, onEvent: (ev: TaskEvent) => void): () => void {
      const es = new EventSource(`${root}/tasks/${encodeURIComponent(taskId)}/events`)
      const handlers = new Map<string, (e: MessageEvent) => void>()
      let closed = false
      // 幂等关闭：终态事件触发自动关闭后，外部再调用退订函数也安全
      const close = () => {
        if (closed) return
        closed = true
        for (const [type, fn] of handlers) es.removeEventListener(type, fn)
        es.close()
      }
      const handle = (type: string) => {
        const fn = (e: MessageEvent) => {
          let payload: Record<string, unknown>
          try {
            payload = JSON.parse(e.data)
          } catch {
            // 单条坏帧不该中断整个监听器分发
            console.warn(`[runtime-client] 忽略无法解析的事件数据 (${type}):`, e.data)
            return
          }
          onEvent({
            taskId,
            seq: (payload.seq as number) ?? 0,
            type: type as TaskEvent["type"],
            payload,
            createdAt: (payload.createdAt as number) ?? Date.now(),
          })
          // 终态事件后流不可能再产生有用数据：自动断开，避免无谓长连接
          if (type === "task_done" || type === "task_failed" || type === "task_cancelled") {
            close()
          }
        }
        handlers.set(type, fn)
        es.addEventListener(type, fn)
      }
      ;[
        "task_started",
        "stage",
        "tool_start",
        "tool_result",
        "log",
        "task_done",
        "task_failed",
        "task_cancelled",
      ].forEach(handle)
      es.onerror = () => {
        /* 浏览器自动重连，无需处理 */
      }
      return close
    },
  }
}

export type RuntimeClient = ReturnType<typeof createRuntimeClient>

/**
 * 通知 Runtime 清除进程内 LLM 模型/Embedding 缓存（POST /llm/cache/clear）。
 * 设置页修改默认 provider/model 后调用，避免 summarize/regenerate 继续使用旧模型。
 * fire-and-forget：Runtime 未启动/重启时静默吞掉错误，绝不阻塞或失败 Web 请求。
 */
export async function clearRuntimeLlmCache(): Promise<void> {
  try {
    await fetch(`${DEFAULT_URL}/llm/cache/clear`, { method: "POST", cache: "no-store" })
  } catch {
    // 忽略：Runtime 暂不可用；下一次写操作会再次触发清除
  }
}
