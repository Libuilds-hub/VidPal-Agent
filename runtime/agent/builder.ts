// runtime/agent/builder.ts —— LangGraph ReAct Agent 构建（系统提示 + 技能注入）
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import type { StructuredTool } from "@langchain/core/tools"

export interface LoadedSkill {
  name: string
  content: string
}

/** 系统提示 + 已装载技能内容 */
export function systemPromptWithSkills(basePrompt: string, skills: LoadedSkill[]): string {
  if (skills.length === 0) return basePrompt
  const skillsSection = skills
    .map((s) => `## 技能: ${s.name}\n${s.content}`)
    .join("\n\n")
  return `${basePrompt}\n\n以下是你当前已装载的技能，请在相关场景严格遵循其中的规则：\n\n${skillsSection}`
}

export function buildAgent(opts: {
  llm: BaseChatModel
  tools: StructuredTool[]
  systemPrompt: string
}): ReturnType<typeof createReactAgent> {
  return createReactAgent({
    llm: opts.llm,
    tools: opts.tools,
    messageModifier: opts.systemPrompt,
  })
}
