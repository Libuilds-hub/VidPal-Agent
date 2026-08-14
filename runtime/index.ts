// runtime/index.ts —— Runtime 进程入口：恢复 → worker → HTTP 服务 → 优雅退出
import { createRuntimeDb } from "./db"
import { TaskEventBus } from "./events"
import { TaskQueue } from "./tasks/queue"
import { echoHandler } from "./tasks/echo"
import { recoverInterruptedTasks } from "./recovery"
import { createRuntimeServer } from "./server"
import { config } from "./config"

const db = createRuntimeDb(config.agentDbPath)
const bus = new TaskEventBus(db)
const queue = new TaskQueue(db, bus, [echoHandler])

// 1. 崩溃恢复（唯一 owner：Runtime）
recoverInterruptedTasks(db)

// 2. 启动 worker
queue.startWorker()

// 3. HTTP 服务
const server = createRuntimeServer({ db, bus, queue })
server.listen(config.port, () => {
  console.log(`[runtime] Agent Runtime 已启动: http://localhost:${config.port}`)
  console.log(`[runtime] workspace: ${config.workspace}`)
})

// 4. 优雅退出
function shutdown(): void {
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
