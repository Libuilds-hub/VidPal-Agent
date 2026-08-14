// runtime/tests/video-db.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import Database from "better-sqlite3"
import { getDevDbPath, ensureDevDbWAL, isVideoFileComplete } from "../video/db"

test("getDevDbPath 从 DATABASE_URL 提取 sqlite 文件路径", () => {
  const p = getDevDbPath("file:D:/Data/code/video-shancn/prisma/dev.db")
  assert.equal(p, "D:/Data/code/video-shancn/prisma/dev.db")
  assert.throws(() => getDevDbPath("postgres://x"), /仅支持 SQLite/)
})

test("isVideoFileComplete：moov 检测（用仓库内已提交的完整视频）", () => {
  assert.equal(isVideoFileComplete("cmsshlcpi0005tuww24b0c7ut"), true)
  assert.equal(isVideoFileComplete("definitely-not-exist"), false)
})

test("ensureDevDbWAL：将新建的 sqlite 文件切换为 WAL 模式", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-db-wal-"))
  const tmpPath = path.join(tmpDir, "dev.db")
  try {
    // 先创建文件（保证 ensureDevDbWAL 走真实 WAL 切换路径而非"文件不存在"分支）
    const db = new Database(tmpPath)
    db.close()
    ensureDevDbWAL("file:" + tmpPath)
    const check = new Database(tmpPath)
    try {
      assert.equal(check.pragma("journal_mode", { simple: true }), "wal")
    } finally {
      check.close()
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

test("ensureDevDbWAL：文件不存在时不抛错（仅警告）", () => {
  const missing = path.join(os.tmpdir(), `video-db-missing-${Date.now()}.db`)
  assert.doesNotThrow(() => ensureDevDbWAL("file:" + missing))
})
