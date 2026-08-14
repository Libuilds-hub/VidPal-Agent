// runtime/shared/types.ts —— Runtime 与 Web 共享的契约（唯一一份定义）

export type TaskStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "cancelled"
  | "interrupted"

export type TaskEventType =
  | "task_started"
  | "stage"
  | "tool_start"
  | "tool_result"
  | "log"
  | "task_done"
  | "task_failed"
  | "task_cancelled"

export interface TaskRow {
  id: string
  type: string
  sessionId: string | null
  status: TaskStatus
  stage: string
  input: string
  result: string | null
  error: string | null
  idempotencyKey: string | null
  cancelRequested: boolean
  createdAt: number
  updatedAt: number
}

export interface TaskEvent {
  taskId: string
  seq: number
  type: TaskEventType
  payload: unknown
  createdAt: number
}

export interface SessionRow {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface CreateTaskRequest {
  type: string
  input?: unknown
  sessionId?: string
  idempotencyKey?: string
}

export interface CreateTaskResponse {
  taskId: string
  reused: boolean
  status: TaskStatus
}
