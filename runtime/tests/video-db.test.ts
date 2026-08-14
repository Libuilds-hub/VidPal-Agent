// runtime/tests/video-db.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { getDevDbPath, isVideoFileComplete } from "../video/db"

test("getDevDbPath 从 DATABASE_URL 提取 sqlite 文件路径", () => {
  const p = getDevDbPath("file:D:/Data/code/video-shancn/prisma/dev.db")
  assert.equal(p, "D:/Data/code/video-shancn/prisma/dev.db")
  assert.throws(() => getDevDbPath("postgres://x"), /仅支持 SQLite/)
})

test("isVideoFileComplete：moov 检测（用仓库内已提交的完整视频）", () => {
  assert.equal(isVideoFileComplete("cmsshlcpi0005tuww24b0c7ut"), true)
  assert.equal(isVideoFileComplete("definitely-not-exist"), false)
})
