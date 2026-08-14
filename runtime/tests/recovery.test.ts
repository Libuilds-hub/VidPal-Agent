// runtime/tests/recovery.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRuntimeDb } from "../db"
import { recoverInterruptedTasks } from "../recovery"
import { TaskEventBus } from "../events"
import { TaskQueue } from "../tasks/queue"
import { echoHandler } from "../tasks/echo"

test("启动恢复：running/interrupted 任务重置为 pending", () => {
  const db = createRuntimeDb(":memory:")
  const now = Date.now()

  const insert = db.prepare(
    `INSERT INTO task (id, type, status, stage, input, created_at, updated_at)
     VALUES (?, ?, ?, 'init', '{}', ?, ?)`
  )
  insert.run("t-running", "echo", "running", now, now)
  insert.run("t-interrupted", "echo", "interrupted", now, now)
  insert.run("t-done", "echo", "done", now, now)
  insert.run("t-pending", "echo", "pending", now, now)

  const recovered = recoverInterruptedTasks(db)

  assert.deepEqual(recovered.sort(), ["t-interrupted", "t-running"])
  const statuses = new Map(
    (db.prepare("SELECT id, status FROM task").all() as Array<{
      id: string
      status: string
    }>).map((r) => [r.id, r.status])
  )
  assert.equal(statuses.get("t-running"), "pending")
  assert.equal(statuses.get("t-interrupted"), "pending")
  assert.equal(statuses.get("t-done"), "done")
  assert.equal(statuses.get("t-pending"), "pending")
  db.close()
})

test("启动恢复：running 且 cancel_requested=1 的任务重置为 pending 并清除取消标志", () => {
  const db = createRuntimeDb(":memory:")
  const now = Date.now()
  db.prepare(
    `INSERT INTO task (id, type, status, stage, input, cancel_requested, created_at, updated_at)
     VALUES (?, 'echo', 'running', 'init', '{}', 1, ?, ?)`
  ).run("t-running-cancel", now, now)

  const recovered = recoverInterruptedTasks(db)

  assert.deepEqual(recovered, ["t-running-cancel"])
  const row = db
    .prepare("SELECT status, cancel_requested FROM task WHERE id = ?")
    .get("t-running-cancel") as { status: string; cancel_requested: number }
  assert.equal(row.status, "pending")
  assert.equal(row.cancel_requested, 0)
  db.close()
})

test("恢复后的任务可被 TaskQueue 重新认领（僵尸取消标志不再卡死任务）", () => {
  const db = createRuntimeDb(":memory:")
  const now = Date.now()
  db.prepare(
    `INSERT INTO task (id, type, status, stage, input, cancel_requested, created_at, updated_at)
     VALUES (?, 'echo', 'running', 'init', '{}', 1, ?, ?)`
  ).run("t-zombie", now, now)

  const recovered = recoverInterruptedTasks(db)
  assert.deepEqual(recovered, ["t-zombie"])

  // 同一 db/bus 上构造真实队列，claimNext 应能认领恢复后的任务
  const bus = new TaskEventBus(db)
  const queue = new TaskQueue(db, bus, [echoHandler])
  const claimed = queue.claimNext()

  assert.ok(claimed, "恢复后的任务应能被 claimNext 认领")
  assert.equal(claimed.id, "t-zombie")
  const row = db
    .prepare("SELECT status, cancel_requested FROM task WHERE id = ?")
    .get("t-zombie") as { status: string; cancel_requested: number }
  assert.equal(row.status, "running")
  assert.equal(row.cancel_requested, 0)
  db.close()
})

test("空库恢复：返回空数组且不报错", () => {
  const db = createRuntimeDb(":memory:")
  assert.deepEqual(recoverInterruptedTasks(db), [])
  db.close()
})
