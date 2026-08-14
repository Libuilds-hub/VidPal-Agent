// runtime/video/db.ts —— Runtime 访问业务库 prisma/dev.db（唯一写方）
import path from "path"
import fs from "fs"
import { PrismaClient } from "@prisma/client"

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
  db.pragma("journal_mode = WAL")
  db.close()
  console.log("[runtime] dev.db WAL 已启用")
}

export const prisma = new PrismaClient()

/** 通用 mp4 完整性检测（moov atom 在文件头或文件尾） */
export function isMp4Complete(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false
  try {
    const fd = fs.openSync(filePath, "r")
    try {
      const size = fs.fstatSync(fd).size
      const headSize = Math.min(size, 1024 * 1024)
      const tailSize = Math.min(size, 1024 * 1024)
      const head = Buffer.alloc(headSize)
      fs.readSync(fd, head, 0, headSize, 0)
      const tail = Buffer.alloc(tailSize)
      fs.readSync(fd, tail, 0, tailSize, size - tailSize)
      return head.includes(Buffer.from("moov")) || tail.includes(Buffer.from("moov"))
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return false
  }
}

/** 视频 video.mp4 是否完整（供恢复/阶段检查） */
export function isVideoFileComplete(videoId: string): boolean {
  return isMp4Complete(
    path.join(process.cwd(), "public", "videos", videoId, "video.mp4")
  )
}
