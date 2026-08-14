// runtime/tests/queue.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRuntimeDb } from "../db"
import { TaskEventBus } from "../events"
import { TaskQueue, TaskCancelledError } from "../tasks/queue"
import { echoHandler } from "../tasks/echo"

test("echo 任务从 pending 跑到 done，事件完整", async () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  const { taskId } = queue.enqueue({
    type: "echo",
    input: { message: "你好", delayMs: 5 },
  })

  await queue.runTaskById(taskId)

  const task = db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as Record<string, unknown>
  assert.equal(task.status, "done")
  assert.equal(task.result, '"你好"')

  const events = db
    .prepare("SELECT type FROM task_event WHERE task_id = ? ORDER BY seq")
    .all(taskId) as Array<{ type: string }>
  assert.deepEqual(
    events.map((e) => e.type),
    ["task_started", "stage", "stage", "log", "task_done"]
  )
  db.close()
})

test("幂等键去重：同 key 返回已有任务", () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  const a = queue.enqueue({ type: "echo", input: {}, idempotencyKey: "k1" })
  const b = queue.enqueue({ type: "echo", input: {}, idempotencyKey: "k1" })

  assert.equal(a.taskId, b.taskId)
  assert.equal(a.reused, false)
  assert.equal(b.reused, true)
  db.close()
})

test("运行中的任务可被协作式取消", async () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  const { taskId } = queue.enqueue({
    type: "echo",
    input: { message: "慢任务", delayMs: 200 },
  })

  // 认领后立即开始执行，30ms 后在运行中请求取消
  queue.claimNext()
  const running = queue.runTaskById(taskId)
  setTimeout(() => queue.requestCancel(taskId), 30)

  await assert.rejects(() => running, TaskCancelledError)

  const task = db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as Record<string, unknown>
  assert.equal(task.status, "cancelled")
  db.close()
})
