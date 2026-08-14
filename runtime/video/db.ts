// runtime/video/db.ts —— Runtime 访问业务库 prisma/dev.db（唯一写方）
import path from "path"
import fs from "fs"
import { prisma } from "../../lib/db"
import { isMp4Complete } from "./yt-dlp"

export { prisma }

/** 从 DATABASE_URL 提取 SQLite 文件路径 */
export function getDevDbPath(databaseUrl: string): string {
  if (!databaseUrl.startsWith("file:")) throw new Error("仅支持 SQLite（file:）DATABASE_URL")
  return databaseUrl.slice("file:".length)
}

/** 一次性开启 dev.db 的 WAL 模式（持久生效；单写方场景避免锁冲突） */
export function ensureDevDbWAL(databaseUrl: string): void {
  const dbPath = getDevDbPath(databaseUrl)
  if (!fs.existsSync(dbPath)) {
    console.warn("[runtime] dev.db 不存在，跳过 WAL 初始化:", dbPath)
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require("better-sqlite3")
  const db = new Database(dbPath)
  // simple: true —— 取第一行第一列的标量（否则返回 [{ journal_mode: ... }] 数组）
  const mode = db.pragma("journal_mode = WAL", { simple: true }) as string
  db.close()
  if (mode !== "wal") {
    console.warn("[runtime] dev.db WAL 未能启用（当前模式: " + mode + "）")
    return
  }
  console.log("[runtime] dev.db WAL 已启用")
}

// isMp4Complete 唯一实现位于 yt-dlp.ts（moov atom 在文件头或文件尾），此处复用并透出
export { isMp4Complete }

/** 视频 video.mp4 是否完整（供恢复/阶段检查） */
export function isVideoFileComplete(videoId: string): boolean {
  return isMp4Complete(
    path.join(process.cwd(), "public", "videos", videoId, "video.mp4")
  )
}
