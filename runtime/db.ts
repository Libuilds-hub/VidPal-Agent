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
  idempotency_key  TEXT,
  cancel_requested INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

-- 幂等去重唯一性只约束非终态任务：终态（done/failed/cancelled/interrupted）后
-- 同 key 允许重新入队（重试同一 URL），因此不用列级 UNIQUE，改用部分唯一索引。
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_idempotency_active
  ON task(idempotency_key) WHERE status IN ('pending', 'running');

-- worker 认领查询索引：WHERE status='pending' AND cancel_requested=0 ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_task_status_created
  ON task(status, cancel_requested, created_at);

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

/**
 * 旧 schema 用列级约束（idempotency_key TEXT UNIQUE），终态任务后同 key 无法重新入队。
 * 检测到旧约束时重建 task 表为"非终态唯一"语义（CREATE TABLE IF NOT EXISTS 不会改动已有表）。
 */
function migrateLegacyTaskIdempotencyUnique(db: Database.Database): void {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'task'")
    .get() as { sql: string } | undefined
  if (!row || !/idempotency_key\s+TEXT\s+UNIQUE/i.test(row.sql)) return
  db.exec(`
    ALTER TABLE task RENAME TO task_legacy;
    CREATE TABLE task (
      id               TEXT PRIMARY KEY,
      type             TEXT NOT NULL,
      session_id       TEXT,
      status           TEXT NOT NULL DEFAULT 'pending',
      stage            TEXT NOT NULL DEFAULT 'init',
      input            TEXT NOT NULL,
      result           TEXT,
      error            TEXT,
      idempotency_key  TEXT,
      cancel_requested INTEGER NOT NULL DEFAULT 0,
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
    INSERT INTO task (id, type, session_id, status, stage, input, result, error, idempotency_key, cancel_requested, created_at, updated_at)
      SELECT id, type, session_id, status, stage, input, result, error, idempotency_key, cancel_requested, created_at, updated_at
      FROM task_legacy;
    DROP TABLE task_legacy;
    CREATE INDEX IF NOT EXISTS idx_task_status_created
      ON task(status, cancel_requested, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_task_idempotency_active
      ON task(idempotency_key) WHERE status IN ('pending', 'running');
  `)
  console.log("[runtime] task 表已迁移：idempotency_key 从全量唯一改为非终态唯一")
}

export function createRuntimeDb(dbPath: string): RuntimeDb {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("busy_timeout = 5000")
  db.exec(SCHEMA)
  migrateLegacyTaskIdempotencyUnique(db)
  return db
}
