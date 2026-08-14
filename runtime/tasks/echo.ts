// runtime/tasks/echo.ts —— 演示任务：分两阶段延时后回显消息
import type { TaskHandler } from "./registry"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const echoHandler: TaskHandler = {
  type: "echo",
  async run(ctx) {
    const input = ctx.input as { message?: string; delayMs?: number }
    const message = input?.message ?? "hello"
    const delayMs = Math.max(0, input?.delayMs ?? 10)

    ctx.emit("stage", { stage: "prepare" })
    await sleep(delayMs / 2)
    ctx.checkCancelled()

    ctx.emit("stage", { stage: "speak" })
    await sleep(delayMs / 2)
    ctx.checkCancelled()

    ctx.emit("log", { message: `echo: ${message}` })
    ctx.setResult(message)
  },
}
