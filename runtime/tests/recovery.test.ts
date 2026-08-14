// runtime/tests/recovery.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRuntimeDb } from "../db"
import { recoverInterruptedTasks } from "../recovery"

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
