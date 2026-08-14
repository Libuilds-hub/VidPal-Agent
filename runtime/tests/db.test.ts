// runtime/tests/db.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRuntimeDb } from "../db"

test("createRuntimeDb 建表并支持读写", () => {
  const db = createRuntimeDb(":memory:")

  // session 表
  const now = Date.now()
  db.prepare(
    "INSERT INTO session (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run("s1", "测试会话", now, now)
  const session = db
    .prepare("SELECT * FROM session WHERE id = ?")
    .get("s1") as Record<string, unknown>
  assert.equal(session.title, "测试会话")

  // task 表
  db.prepare(
    `INSERT INTO task (id, type, session_id, status, stage, input, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("t1", "echo", "s1", "pending", "init", '{"message":"hi"}', now, now)
  const task = db.prepare("SELECT * FROM task WHERE id = ?").get("t1") as Record<string, unknown>
  assert.equal(task.status, "pending")
  assert.equal(task.cancel_requested, 0)

  // task_event 表
  db.prepare(
    "INSERT INTO task_event (task_id, seq, type, payload, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run("t1", 1, "log", '{"message":"hello"}', now)
  const ev = db.prepare("SELECT * FROM task_event WHERE task_id = ?").get("t1") as Record<string, unknown>
  assert.equal(ev.type, "log")
  assert.equal(ev.seq, 1)

  // 幂等键唯一索引
  assert.throws(() => {
    db.prepare(
      `INSERT INTO task (id, type, status, stage, input, idempotency_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("t2", "echo", "pending", "init", "{}", "key-1", now, now)
    db.prepare(
      `INSERT INTO task (id, type, status, stage, input, idempotency_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("t3", "echo", "pending", "init", "{}", "key-1", now, now)
  })

  db.close()
})
