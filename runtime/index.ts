// runtime/index.ts —— Runtime 进程入口：恢复 → worker → HTTP 服务 → 优雅退出
import { createRuntimeDb } from "./db"
import { ensureDevDbWAL, prisma } from "./video/db"
import { TaskEventBus } from "./events"
import { TaskQueue } from "./tasks/queue"
import { echoHandler } from "./tasks/echo"
import { importVideoHandler, regenerateHandler } from "./video/import-video"
import { recoverInterruptedTasks } from "./recovery"
import { createRuntimeServer } from "./server"
import { config } from "./config"
import { ToolRegistry } from "./tools/registry"
import { createFsTools } from "./tools/fs-tools"
import { createShellTool } from "./tools/shell-tool"
import { createWebSearchTool } from "./tools/web-search"
import { createHttpTool } from "./tools/http-tool"
import { createSearchVideosTool } from "./agent/tools/search-videos"
import { createSearchTranscriptsTool } from "./agent/tools/search-transcripts"
import { createGetVideoContextTool } from "./agent/tools/get-video-context"
import { createImportVideoTool } from "./agent/tools/import-video"
import { langchainToolsFromRegistry } from "./agent/langchain-adapter"
import { buildAgent, systemPromptWithSkills } from "./agent/builder"
import { getCachedAgent, setCachedAgent } from "./agent/cache"
import { scanSkillsDir, loadSkill, SKILLS_ROOT } from "./skills/registry"
import { getChatModel } from "./llm"
import type { ChatServices } from "./chat"

const db = createRuntimeDb(config.agentDbPath)
if (process.env.DATABASE_URL) {
  ensureDevDbWAL(process.env.DATABASE_URL)
}
const bus = new TaskEventBus(db)
const queue = new TaskQueue(db, bus, [echoHandler, importVideoHandler, regenerateHandler])

// ---- 工具注册（10 个：4 文件/命令 + 2 网络 + 4 视频）----
// 注意：createImportVideoTool 的 enqueue 依赖 queue 实例，必须放在 queue 创建之后。
const registry = new ToolRegistry()
for (const t of [
  ...createFsTools(config.workspace),
  createShellTool(config.workspace),
  createWebSearchTool(),
  createHttpTool(),
  createSearchVideosTool(),
  createSearchTranscriptsTool(),
  createGetVideoContextTool(),
  createImportVideoTool({ enqueue: (input) => queue.enqueue(input) }),
]) {
  registry.register(t)
}

const SYSTEM_PROMPT = `你是"视频学习助手"，一个 AI 驱动的视频学习平台，帮助用户搜索、分析和理解视频内容。你可以使用以下工具：
${registry.list().map((t) => `- ${t.name}: ${t.description}`).join("\n")}
工具返回的是结构化摘要；需要更多细节时使用更具体的工具或询问用户。`

// Agent 缓存（按 model/provider 键控；技能在构建时固定为 default: true 集合）。
// 缓存放 runtime/agent/cache.ts：/llm/cache/clear 需要清空它（Agent 持有旧配置的
// ChatOpenAI），但 server.ts 不能导入 index.ts（进程入口，导入即启动服务器）。
const chat: ChatServices = {
  async getAgent(model, provider) {
    const key = `${provider ?? ""}|${model ?? ""}`
    const cached = getCachedAgent(key)
    if (cached) return cached as never
    const llm = await getChatModel(model, provider)
    // 默认装载 default: true 的技能（当前为 video-study）
    const skills = scanSkillsDir()
      .filter((s) => s.default)
      .map((s) => ({ name: s.name, content: loadSkill(SKILLS_ROOT, s.name) ?? "" }))
      .filter((s) => s.content)
    const agent = buildAgent({
      llm,
      tools: langchainToolsFromRegistry(registry),
      systemPrompt: systemPromptWithSkills(SYSTEM_PROMPT, skills),
    })
    setCachedAgent(key, agent)
    // 技能版本快照（skill_usage 表，task_id 用 chat:default 表示聊天默认集合）
    try {
      for (const s of skills) {
        const entry = scanSkillsDir().find((e) => e.name === s.name)
        db.prepare(
          "INSERT OR IGNORE INTO skill_usage (task_id, skill_name, version) VALUES ('chat:default', ?, ?)"
        ).run(s.name, entry?.version ?? "0.0.0")
      }
    } catch (err) {
      console.warn("[runtime] 技能快照写入失败:", err)
    }
    return agent as never
  },
}

// 1. 崩溃恢复（唯一 owner：Runtime）
recoverInterruptedTasks(db)

// 2. 启动 worker
queue.startWorker()

// 3. HTTP 服务
const server = createRuntimeServer({ db, bus, queue, chat })
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
    // 先断开 Prisma 连接，再关 better-sqlite3 连接，避免连接未释放
    prisma.$disconnect().finally(() => {
      db.close()
      process.exit(0)
    })
  })
  // 兜底：5 秒强制退出
  setTimeout(() => process.exit(0), 5000).unref()
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
