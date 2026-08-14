// runtime/events.ts —— 事件先写 task_event 表，再通知内存订阅者；支持按 seq 回放
import type { RuntimeDb } from "./db"
import type { TaskEvent, TaskEventType } from "./shared/types"

type Listener = (ev: TaskEvent) => void

export class TaskEventBus {
  private listeners = new Map<string, Set<Listener>>()

  constructor(private db: RuntimeDb) {}

  emit(taskId: string, type: TaskEventType, payload: unknown): void {
    const seq = this.lastSeq(taskId) + 1
    const createdAt = Date.now()
    this.db
      .prepare(
        "INSERT INTO task_event (task_id, seq, type, payload, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(taskId, seq, type, JSON.stringify(payload ?? {}), createdAt)
    const ev: TaskEvent = { taskId, seq, type, payload: payload ?? {}, createdAt }
    const set = this.listeners.get(taskId)
    if (set) {
      for (const fn of [...set]) fn(ev)
    }
  }

  on(taskId: string, fn: Listener): () => void {
    const set = this.listeners.get(taskId) ?? new Set<Listener>()
    set.add(fn)
    this.listeners.set(taskId, set)
    return () => {
      set.delete(fn)
      if (set.size === 0) this.listeners.delete(taskId)
    }
  }

  lastSeq(taskId: string): number {
    const row = this.db
      .prepare("SELECT MAX(seq) AS max FROM task_event WHERE task_id = ?")
      .get(taskId) as { max: number | null } | undefined
    return row?.max ?? 0
  }

  /** 回放 seq > afterSeq 的事件（用于 SSE Last-Event-ID 断线续传） */
  replay(taskId: string, afterSeq: number): TaskEvent[] {
    const rows = this.db
      .prepare(
        "SELECT task_id, seq, type, payload, created_at FROM task_event WHERE task_id = ? AND seq > ? ORDER BY seq"
      )
      .all(taskId, afterSeq) as Array<{
      task_id: string
      seq: number
      type: string
      payload: string
      created_at: number
    }>
    return rows.map((r) => ({
      taskId: r.task_id,
      seq: r.seq,
      type: r.type as TaskEventType,
      payload: JSON.parse(r.payload),
      createdAt: r.created_at,
    }))
  }
}
