// runtime/tests/video-db.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import Database from "better-sqlite3"
import { getDevDbPath, ensureDevDbWAL, isVideoFileComplete, isMp4Complete } from "../video/db"

test("getDevDbPath 从 DATABASE_URL 提取 sqlite 文件路径", () => {
  const p = getDevDbPath("file:D:/projects/demo-app/prisma/dev.db")
  assert.equal(p, "D:/projects/demo-app/prisma/dev.db")
  assert.throws(() => getDevDbPath("postgres://x"), /仅支持 SQLite/)
})

test("isMp4Complete：moov 位于文件头/尾均视为完整，缺失或不存在则否", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mp4-moov-"))
  try {
    // 完整 mp4：moov atom 在文件头
    const head = path.join(dir, "head.mp4")
    fs.writeFileSync(head, Buffer.concat([Buffer.from("ftypmoovfree"), Buffer.alloc(32)]))
    assert.equal(isMp4Complete(head), true)

    // 完整 mp4：moov atom 在文件尾（常见于流式写入）
    const tail = path.join(dir, "tail.mp4")
    fs.writeFileSync(tail, Buffer.concat([Buffer.alloc(32), Buffer.from("mdatmoov")]))
    assert.equal(isMp4Complete(tail), true)

    // 转码中断：没有 moov atom
    const broken = path.join(dir, "broken.mp4")
    fs.writeFileSync(broken, Buffer.from("ftypmdatpartial"))
    assert.equal(isMp4Complete(broken), false)

    // 文件不存在：不抛错，返回 false
    assert.equal(isMp4Complete(path.join(dir, "absent.mp4")), false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// 用临时构造的 fixture，不依赖仓库内已提交的媒体文件
// （public/videos/ 不入库，否则全新 clone 上此测试必然失败）
test("isVideoFileComplete：按 videoId 解析 public/videos/<id>/video.mp4", () => {
  const videosRoot = path.join(process.cwd(), "public", "videos")
  const rootExistedBefore = fs.existsSync(videosRoot)
  const id = `test-moov-${Date.now()}`
  const dir = path.join(videosRoot, id)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, "video.mp4"), Buffer.from("ftyp....moov....mdat"))
    assert.equal(isVideoFileComplete(id), true)
    assert.equal(isVideoFileComplete("definitely-not-exist"), false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
    // 若 public/videos 是本用例创建的，结束后一并清掉，避免留下空目录
    // （用 rmdirSync 而非 rmSync：目录非空则失败，不会误删别人的文件）
    if (!rootExistedBefore) {
      try {
        fs.rmdirSync(videosRoot)
      } catch {
        /* 非空则保留 */
      }
    }
  }
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
