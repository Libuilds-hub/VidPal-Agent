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

test("pending 任务直接取消：状态置 cancelled 且发出 task_cancelled 事件", () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  const { taskId } = queue.enqueue({
    type: "echo",
    input: { message: "取消我", delayMs: 5 },
  })

  // 不 claim，直接对 pending 任务取消
  const ok = queue.requestCancel(taskId)

  assert.equal(ok, true)
  const task = db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as Record<string, unknown>
  assert.equal(task.status, "cancelled")

  const events = db
    .prepare("SELECT type FROM task_event WHERE task_id = ? ORDER BY seq")
    .all(taskId) as Array<{ type: string }>
  assert.deepEqual(
    events.map((e) => e.type),
    ["task_cancelled"]
  )
  db.close()
})

test("已 done 任务重复 runTaskById：不重跑 handler、事件不增加", async () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  const { taskId } = queue.enqueue({
    type: "echo",
    input: { message: "x", delayMs: 5 },
  })

  await queue.runTaskById(taskId)
  assert.equal(
    (db.prepare("SELECT status FROM task WHERE id = ?").get(taskId) as { status: string }).status,
    "done"
  )

  // 终态任务重复调用不应重跑 handler
  await queue.runTaskById(taskId)

  const count = db.prepare("SELECT COUNT(*) AS c FROM task_event WHERE task_id = ?").get(taskId) as {
    c: number
  }
  assert.equal(count.c, 5)
  const task = db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as Record<string, unknown>
  assert.equal(task.status, "done")
  db.close()
})

test("worker 循环自动执行两个 echo 任务到 done，事件完整", async () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  const a = queue.enqueue({ type: "echo", input: { message: "A", delayMs: 5 } })
  const b = queue.enqueue({ type: "echo", input: { message: "B", delayMs: 5 } })

  queue.startWorker()

  // 轮询等待两个任务都到 done（2 秒超时，每 50ms 查一次）
  const statusOf = (id: string) =>
    (db.prepare("SELECT status FROM task WHERE id = ?").get(id) as { status: string }).status
  const deadline = Date.now() + 2000
  while (Date.now() < deadline) {
    if (statusOf(a.taskId) === "done" && statusOf(b.taskId) === "done") break
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  queue.stopWorker()

  assert.equal(statusOf(a.taskId), "done")
  assert.equal(statusOf(b.taskId), "done")

  for (const id of [a.taskId, b.taskId]) {
    const events = db
      .prepare("SELECT type FROM task_event WHERE task_id = ? ORDER BY seq")
      .all(id) as Array<{ type: string }>
    assert.deepEqual(
      events.map((e) => e.type),
      ["task_started", "stage", "stage", "log", "task_done"]
    )
  }
  db.close()
})

test("worker 取消任务：取消是正常终态，不输出执行异常日志", async () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  const { taskId } = queue.enqueue({
    type: "echo",
    input: { message: "取消我", delayMs: 200 },
  })

  // 拦截 console.error：验证取消路径不产生"执行异常"日志
  const logged: string[] = []
  const origError = console.error
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "))
  }

  try {
    queue.startWorker()
    // 等 worker 认领并进入 echo 延时（200ms 分两段），30ms 后请求取消
    await new Promise((resolve) => setTimeout(resolve, 30))
    const ok = queue.requestCancel(taskId)
    assert.equal(ok, true)

    // 轮询等待任务到达 cancelled（2 秒超时，每 50ms 查一次）
    const statusOf = (id: string) =>
      (db.prepare("SELECT status FROM task WHERE id = ?").get(id) as { status: string }).status
    const deadline = Date.now() + 2000
    while (Date.now() < deadline && statusOf(taskId) !== "cancelled") {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  } finally {
    queue.stopWorker()
    console.error = origError
  }

  // 取消是正常终态：不应有任何"执行异常"日志
  assert.equal(
    logged.some((msg) => msg.includes("执行异常")),
    false,
    `取消不应记录执行异常日志，实际日志: ${JSON.stringify(logged)}`
  )
  const task = db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as Record<string, unknown>
  assert.equal(task.status, "cancelled")
  db.close()
})

test("worker 循环在 DB 故障时不被击穿：claimNext 抛错被捕获、进程不崩溃", async () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])

  // 拦截 console.error：验证循环异常被捕获并记录（而非成为未处理拒绝击穿进程）
  const logged: string[] = []
  const origError = console.error
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "))
  }

  try {
    queue.startWorker()
    // 关闭连接：之后 prepare/run 抛 "The database connection is not open"
    db.close()

    // 空轮询 300ms 后 claimNext 首次抛错 → catch → sleep(1000)；多等 100ms 确保日志已落
    await new Promise((resolve) => setTimeout(resolve, 400))
    queue.stopWorker()
  } finally {
    console.error = origError
  }

  // catch 分支已触发：输出了 worker 循环异常日志，且未发生未处理拒绝（进程存活）
  assert.ok(
    logged.some((msg) => msg.includes("worker 循环异常")),
    `应捕获到 worker 循环异常日志，实际日志: ${JSON.stringify(logged)}`
  )
})
