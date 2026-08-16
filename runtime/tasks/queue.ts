// runtime/tasks/queue.ts —— 入队/认领/状态流转/协作式取消/worker 循环
import type { RuntimeDb } from "../db"
import type { TaskEventBus } from "../events"
import type { TaskHandler, TaskContext } from "./registry"
import { createTaskContext, TaskCancelledError } from "./registry"
import type { CreateTaskResponse, TaskRow, TaskStatus } from "../shared/types"

export { TaskCancelledError }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface TaskDbRow {
  id: string
  type: string
  session_id: string | null
  status: string
  stage: string
  input: string
  result: string | null
  error: string | null
  idempotency_key: string | null
  cancel_requested: number
  created_at: number
  updated_at: number
}

function rowToTask(row: TaskDbRow): TaskRow {
  return {
    id: row.id,
    type: row.type,
    sessionId: row.session_id,
    status: row.status as TaskStatus,
    stage: row.stage,
    input: row.input,
    result: row.result,
    error: row.error,
    idempotencyKey: row.idempotency_key,
    cancelRequested: row.cancel_requested === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class TaskQueue {
  private handlers = new Map<string, TaskHandler>()
  private workerRunning = false
  /** 运行中任务 → 取消信号控制器（requestCancel 对 running 任务 abort，子进程级中断） */
  private controllers = new Map<string, AbortController>()

  constructor(
    private db: RuntimeDb,
    private bus: TaskEventBus,
    handlers: TaskHandler[]
  ) {
    for (const h of handlers) this.handlers.set(h.type, h)
  }

  enqueue(input: {
    type: string
    input?: unknown
    sessionId?: string
    idempotencyKey?: string
  }): CreateTaskResponse {
    const now = Date.now()
    // 幂等去重：仅对非终态任务（pending/running）去重；
    // 终态任务（done/failed/cancelled/interrupted）同 key 重新入队应创建新任务，否则失败/取消后永远无法重试同一 URL
    if (input.idempotencyKey) {
      const existing = this.db
        .prepare(
          "SELECT id FROM task WHERE idempotency_key = ? AND status IN ('pending', 'running')"
        )
        .get(input.idempotencyKey) as { id: string } | undefined
      if (existing) {
        const row = this.db
          .prepare("SELECT * FROM task WHERE id = ?")
          .get(existing.id) as TaskDbRow
        return { taskId: existing.id, reused: true, status: row.status as TaskStatus }
      }
    }

    const taskId = crypto.randomUUID()
    this.db
      .prepare(
        `INSERT INTO task (id, type, session_id, status, stage, input, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 'init', ?, ?, ?, ?)`
      )
      .run(
        taskId,
        input.type,
        input.sessionId ?? null,
        JSON.stringify(input.input ?? {}),
        input.idempotencyKey ?? null,
        now,
        now
      )
    return { taskId, reused: false, status: "pending" }
  }

  claimNext(): TaskDbRow | null {
    const row = this.db
      .prepare(
        `SELECT * FROM task WHERE status = 'pending' AND cancel_requested = 0
         ORDER BY created_at ASC LIMIT 1`
      )
      .get() as TaskDbRow | undefined
    if (!row) return null
    this.db
      .prepare("UPDATE task SET status = 'running', updated_at = ? WHERE id = ?")
      .run(Date.now(), row.id)
    return row
  }

  getTask(taskId: string): TaskRow | null {
    const row = this.db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as
      | TaskDbRow
      | undefined
    return row ? rowToTask(row) : null
  }

  listTasks(sessionId?: string, type?: string): TaskRow[] {
    let sql = "SELECT * FROM task"
    const conds: string[] = []
    const params: Array<string> = []
    if (sessionId) {
      conds.push("session_id = ?")
      params.push(sessionId)
    }
    if (type) {
      conds.push("type = ?")
      params.push(type)
    }
    if (conds.length > 0) sql += " WHERE " + conds.join(" AND ")
    sql += " ORDER BY created_at DESC"
    const rows = (
      params.length > 0
        ? this.db.prepare(sql).all(...params)
        : this.db.prepare(sql).all()
    ) as TaskDbRow[]
    return rows.map(rowToTask)
  }

  /** 重试终态任务：用原输入新建任务（不带幂等键，避免被旧任务挡住） */
  retryTask(taskId: string): { taskId: string } | null {
    const row = this.db
      .prepare("SELECT * FROM task WHERE id = ?")
      .get(taskId) as TaskDbRow | undefined
    if (!row) return null
    if (row.status === "pending" || row.status === "running") return null
    const newId = crypto.randomUUID()
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO task (id, type, session_id, status, stage, input, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 'init', ?, NULL, ?, ?)`
      )
      .run(newId, row.type, row.session_id, row.input, now, now)
    return { taskId: newId }
  }

  requestCancel(taskId: string): boolean {
    const row = this.db.prepare("SELECT status FROM task WHERE id = ?").get(taskId) as
      | { status: string }
      | undefined
    if (!row || (row.status !== "pending" && row.status !== "running")) return false
    const res = this.db
      .prepare(
        `UPDATE task SET cancel_requested = 1, updated_at = ?,
         status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END
         WHERE id = ? AND status IN ('pending', 'running')`
      )
      .run(Date.now(), taskId)
    // pending → cancelled 由 requestCancel 直接完成状态流转，必须补发取消事件；
    // running 只置取消标志，事件由 handler 阶段检查经 markCancelled 发出，避免重复。
    if (row.status === "pending") {
      this.bus.emit(taskId, "task_cancelled", {})
    } else {
      // running：同时 abort 任务信号（子进程级中断），与 DB 取消标志构成双通道取消
      this.controllers.get(taskId)?.abort()
    }
    return res.changes > 0
  }

  private isCancelled(taskId: string): boolean {
    const row = this.db
      .prepare("SELECT cancel_requested FROM task WHERE id = ?")
      .get(taskId) as { cancel_requested: number } | undefined
    return row?.cancel_requested === 1
  }

  /** 执行单个任务到终态（测试与 worker 共用） */
  async runTaskById(taskId: string): Promise<void> {
    // 每任务一个取消信号：requestCancel 对 running 任务 abort 它（子进程级中断）
    const controller = new AbortController()
    try {
      const row = this.db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as
        | TaskDbRow
        | undefined
      if (!row) {
        console.error(`[runtime] runTaskById: 任务不存在: ${taskId}`)
        return
      }
      // 终态任务（done/failed/cancelled/interrupted）不重跑 handler
      if (row.status !== "pending" && row.status !== "running") return

      const handler = this.handlers.get(row.type)
      if (!handler) {
        this.markFailed(taskId, `未知任务类型: ${row.type}`)
        return
      }
      if (this.isCancelled(taskId)) {
        this.markCancelled(taskId)
        return
      }

      this.bus.emit(taskId, "task_started", { type: row.type })

      // 输入解析：损坏的输入直接判失败，不进入 handler
      let input: unknown
      try {
        input = JSON.parse(row.input)
      } catch {
        this.markFailed(taskId, "任务输入损坏")
        return
      }
      // 注册取消信号：handler 的 ctx.signal 与 requestCancel 的 abort 经此控制器接通
      this.controllers.set(taskId, controller)
      const ctx: TaskContext = createTaskContext(
        taskId,
        input,
        this.bus,
        controller.signal,
        () => this.isCancelled(taskId),
        (result) => this.markDone(taskId, result)
      )

      try {
        await handler.run(ctx)
        // 处理器可能已通过 setResult 完成状态流转；未完成则补终态
        const cur = this.db.prepare("SELECT status FROM task WHERE id = ?").get(taskId) as {
          status: string
        }
        if (cur.status === "running") this.markDone(taskId, "{}")
      } catch (err) {
        const cur = this.db.prepare("SELECT status FROM task WHERE id = ?").get(taskId) as {
          status: string
        }
        // 结果已落库（setResult → done）后抛出的异常不再改写状态
        if (cur.status !== "running") return
        // 取消判定：TaskCancelledError（协作式）、DB 取消标记、或子进程 abort 路径。
        // execWithSignal 在 signal 中止时抛 "任务已取消"；Node 自身 abort 错误是
        // name === "AbortError" 的 DOMException——message/name 双查，鲁棒覆盖。
        const cancelled =
          err instanceof TaskCancelledError ||
          this.isCancelled(taskId) ||
          (err instanceof Error &&
            (err.message === "任务已取消" ||
              err.message.includes("abort") ||
              err.name === "AbortError"))
        if (cancelled) {
          // 取消（含子进程 abort 路径）→ cancelled，不是 failed
          this.markCancelled(taskId)
          throw err
        }
        this.markFailed(taskId, err instanceof Error ? err.message : String(err))
      }
    } finally {
      // 任务结束（任意路径）：中止信号并注销，避免控制器泄漏
      controller.abort()
      this.controllers.delete(taskId)
    }
  }

  private markDone(taskId: string, result: string): void {
    this.db
      .prepare(
        "UPDATE task SET status = 'done', result = ?, cancel_requested = 0, updated_at = ? WHERE id = ?"
      )
      .run(result, Date.now(), taskId)
    this.bus.emit(taskId, "task_done", { result })
  }

  private markFailed(taskId: string, error: string): void {
    this.db
      .prepare(
        "UPDATE task SET status = 'failed', error = ?, cancel_requested = 0, updated_at = ? WHERE id = ?"
      )
      .run(error, Date.now(), taskId)
    this.bus.emit(taskId, "task_failed", { error })
  }

  private markCancelled(taskId: string): void {
    this.db
      .prepare("UPDATE task SET status = 'cancelled', updated_at = ? WHERE id = ?")
      .run(Date.now(), taskId)
    this.bus.emit(taskId, "task_cancelled", {})
  }

  /** 启动 worker 循环：不断认领 pending 任务并发执行（不等待） */
  startWorker(): void {
    if (this.workerRunning) return
    this.workerRunning = true
    void this.loop()
  }

  stopWorker(): void {
    this.workerRunning = false
  }

  private async loop(): Promise<void> {
    while (this.workerRunning) {
      try {
        const row = this.claimNext()
        if (!row) {
          await sleep(300)
          continue
        }
        void this.runTaskById(row.id).catch((err) => {
          if (err instanceof TaskCancelledError) return // 取消是正常终态，不记错误日志
          console.error(`[runtime] 任务 ${row.id} 执行异常:`, err)
        })
      } catch (err) {
        console.error("[runtime] worker 循环异常，1s 后重试:", err)
        await sleep(1000)
      }
    }
  }
}
