// runtime/tasks/registry.ts —— 任务类型 → 处理器 注册表
import type { TaskEventBus } from "../events"

export class TaskCancelledError extends Error {
  constructor() {
    super("Task cancelled")
    this.name = "TaskCancelledError"
  }
}

export interface TaskContext {
  taskId: string
  input: unknown
  bus: TaskEventBus
  /** 阶段切换时调用：检查取消标记，已取消则抛 TaskCancelledError */
  checkCancelled(): void
  emit(type: "stage" | "log" | "tool_start" | "tool_result", payload: unknown): void
  /** 返回序列化后的结果（存 task.result） */
  setResult(result: unknown): void
}

export interface TaskHandler {
  type: string
  run(ctx: TaskContext): Promise<void>
}

export function createTaskContext(
  taskId: string,
  input: unknown,
  bus: TaskEventBus,
  isCancelled: () => boolean,
  setResult: (result: string) => void
): TaskContext {
  return {
    taskId,
    input,
    bus,
    checkCancelled() {
      if (isCancelled()) throw new TaskCancelledError()
    },
    emit(type, payload) {
      bus.emit(taskId, type, payload)
    },
    setResult(result) {
      setResult(JSON.stringify(result))
    },
  }
}
