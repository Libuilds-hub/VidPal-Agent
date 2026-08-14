// runtime/db.ts —— better-sqlite3 初始化 + 建表（WAL 模式）
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

const SCHEMA = `
CREATE TABLE IF NOT EXISTS session (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '新会话',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS task (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  session_id       TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  stage            TEXT NOT NULL DEFAULT 'init',
  input            TEXT NOT NULL,
  result           TEXT,
  error            TEXT,
  idempotency_key  TEXT UNIQUE,
  cancel_requested INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS task_event (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_event_task_seq ON task_event(task_id, seq);

CREATE TABLE IF NOT EXISTS skill_usage (
  task_id    TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  version    TEXT NOT NULL,
  PRIMARY KEY (task_id, skill_name)
);
`

export type RuntimeDb = Database.Database

export function createRuntimeDb(dbPath: string): RuntimeDb {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("busy_timeout = 5000")
  db.exec(SCHEMA)
  return db
}
