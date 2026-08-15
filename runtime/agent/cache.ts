// runtime/agent/cache.ts —— Agent 实例缓存（跨进程内共享）
// 独立于 llm.ts 的模型缓存：Agent 持有 ChatOpenAI 实例（含 apiKey/baseUrl/model），
// 设置变更时 /llm/cache/clear 必须同时清空这里，否则缓存的 Agent 继续用旧配置。
// 独立成模块是为了让 server.ts 能安全动态导入（index.ts 是进程入口，导入会启动服务器）。
import type { buildAgent } from "./builder"

const agentCache = new Map<string, ReturnType<typeof buildAgent>>()

export function getCachedAgent(key: string): ReturnType<typeof buildAgent> | undefined {
  return agentCache.get(key)
}
export function setCachedAgent(key: string, agent: ReturnType<typeof buildAgent>): void {
  agentCache.set(key, agent)
}
export function clearAgentCache(): void {
  agentCache.clear()
}
