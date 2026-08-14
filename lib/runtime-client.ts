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
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error || `Runtime 请求失败: HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  return {
    baseUrl,
    submitTask(req: CreateTaskRequest): Promise<CreateTaskResponse> {
      return request("/tasks", { method: "POST", body: JSON.stringify(req) })
    },
    getTask(taskId: string): Promise<TaskRow> {
      return request(`/tasks/${taskId}`)
    },
    listTasks(sessionId?: string): Promise<TaskRow[]> {
      return request(`/tasks${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`)
    },
    cancelTask(taskId: string): Promise<{ ok: boolean }> {
      return request(`/tasks/${taskId}/cancel`, { method: "POST" })
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
      const es = new EventSource(`${baseUrl}/tasks/${taskId}/events`)
      const handlers = new Map<string, (e: MessageEvent) => void>()
      const handle = (type: string) => {
        const fn = (e: MessageEvent) => {
          const payload = JSON.parse(e.data)
          onEvent({
            taskId,
            seq: payload.seq ?? 0,
            type: type as TaskEvent["type"],
            payload,
            createdAt: Date.now(),
          })
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
      return () => {
        for (const [type, fn] of handlers) es.removeEventListener(type, fn)
        es.close()
      }
    },
  }
}

export type RuntimeClient = ReturnType<typeof createRuntimeClient>
