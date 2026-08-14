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

test("旧版 agent.db（列级 UNIQUE）迁移：保留数据并重建部分唯一索引", () => {
  const fs = require("fs") as typeof import("fs")
  const os = require("os") as typeof import("os")
  const path = require("path") as typeof import("path")
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rt-mig-"))
  const dbPath = path.join(tmpDir, "agent.db")
  try {
    // 用旧 DDL 造库（列级 UNIQUE）
    const Database = require("better-sqlite3")
    const legacy = new Database(dbPath)
    legacy.exec(`
      CREATE TABLE task (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        session_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        stage TEXT NOT NULL DEFAULT 'init',
        input TEXT NOT NULL,
        result TEXT,
        error TEXT,
        idempotency_key TEXT UNIQUE,
        cancel_requested INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO task (id, type, status, input, idempotency_key, created_at, updated_at)
        VALUES ('t-done', 'echo', 'done', '{}', 'k1', 1, 1),
               ('t-pending', 'echo', 'pending', '{}', 'k2', 1, 1),
               ('t-nokey', 'echo', 'pending', '{}', NULL, 1, 1);
    `)
    legacy.close()

    // 用新 createRuntimeDb 打开 → 触发迁移
    const db = createRuntimeDb(dbPath)
    // 数据保留
    const rows = db.prepare("SELECT id, status FROM task ORDER BY id").all() as Array<{ id: string; status: string }>
    assert.deepEqual(rows, [
      { id: "t-done", status: "done" },
      { id: "t-nokey", status: "pending" },
      { id: "t-pending", status: "pending" },
    ])
    // 部分唯一索引生效：pending 同 key 再插被拒，done 同 key 允许
    assert.throws(() => {
      db.prepare(
        "INSERT INTO task (id, type, status, input, idempotency_key, created_at, updated_at) VALUES (?, 'echo', 'pending', '{}', 'k2', 1, 1)"
      ).run("t-x")
    })
    db.prepare(
      "INSERT INTO task (id, type, status, input, idempotency_key, created_at, updated_at) VALUES (?, 'echo', 'done', '{}', 'k1', 1, 1)"
    ).run("t-y")
    db.close()
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
