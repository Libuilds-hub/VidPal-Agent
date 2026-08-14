// runtime/index.ts —— Runtime 进程入口：恢复 → worker → HTTP 服务 → 优雅退出
import { createRuntimeDb } from "./db"
import { ensureDevDbWAL } from "./video/db"
import { TaskEventBus } from "./events"
import { TaskQueue } from "./tasks/queue"
import { echoHandler } from "./tasks/echo"
import { recoverInterruptedTasks } from "./recovery"
import { createRuntimeServer } from "./server"
import { config } from "./config"

const db = createRuntimeDb(config.agentDbPath)
if (process.env.DATABASE_URL) {
  ensureDevDbWAL(process.env.DATABASE_URL)
}
const bus = new TaskEventBus(db)
const queue = new TaskQueue(db, bus, [echoHandler])

// 1. 崩溃恢复（唯一 owner：Runtime）
recoverInterruptedTasks(db)

// 2. 启动 worker
queue.startWorker()

// 3. HTTP 服务
const server = createRuntimeServer({ db, bus, queue })
// EADDRINUSE 等启动失败给出友好提示后退出（默认行为是抛未捕获异常）
server.on("error", (err) => {
  console.error("[runtime] 服务启动失败:", err.message)
  process.exit(1)
})
server.listen(config.port, () => {
  console.log(`[runtime] Agent Runtime 已启动: http://localhost:${config.port}`)
  console.log(`[runtime] workspace: ${config.workspace}`)
})

// 4. 优雅退出
let shuttingDown = false
function shutdown(): void {
  if (shuttingDown) return // 双信号防护：重复 SIGINT/SIGTERM 不二次执行
  shuttingDown = true
  console.log("[runtime] 正在关闭...")
  queue.stopWorker()
  server.close(() => {
    db.close()
    process.exit(0)
  })
  // 兜底：5 秒强制退出
  setTimeout(() => process.exit(0), 5000).unref()
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
