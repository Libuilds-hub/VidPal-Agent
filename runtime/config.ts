// runtime/config.ts —— 读取共享 .env（npm 脚本从项目根目录启动，cwd 即根目录）
import "dotenv/config"

export const config = {
  // 环境变量非法时回退默认端口，避免 server.listen(NaN) 的隐性失败
  port: (() => {
    const p = Number(process.env.RUNTIME_PORT || 3100)
    return Number.isFinite(p) && p > 0 ? p : 3100
  })(),
  agentDbPath: process.env.AGENT_DB_PATH || "data/agent.db",
  workspace: process.env.RUNTIME_WORKSPACE || process.cwd(),
  webOrigin: process.env.RUNTIME_WEB_ORIGIN || "http://localhost:3000",
}
