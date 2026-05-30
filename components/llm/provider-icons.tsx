import type { ReactNode } from "react"
import { Minimax, DeepSeek, LmStudio, Moonshot, OpenAI, Google, Anthropic, Zhipu, OpenRouter, Ollama } from "@lobehub/icons"

type IconComponent = React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>

const iconMap: Record<string, IconComponent> = {
  minimax: Minimax,
  deepseek: DeepSeek,
  lmstudio: LmStudio,
  moonshot: Moonshot,
  kimi: Moonshot,
  openai: OpenAI,
  google: Google,
  gemini: Google,
  anthropic: Anthropic,
  claude: Anthropic,
  zhipu: Zhipu,
  glm: Zhipu,
  chatglm: Zhipu,
  openrouter: OpenRouter,
  ollama: Ollama,
}

const providerDescriptions: Record<string, string> = {
  minimax: "MiniMax 提供对 M2.7 等模型的访问，适用于编程任务与通用文本生成。",
  deepseek: "DeepSeek 提供先进的语言模型，支持深度思考与代码生成。",
  openrouter: "OpenRouter 统一接口访问多种 AI 模型，灵活选择供应商。",
  openai: "OpenAI 构建了 GPT 系列模型，为通用与编程任务提供领先性能。",
  google: "Google 的 Gemini 系列由 DeepMind 构建，支持文本、代码与多模态。",
  anthropic: "Anthropic 构建了 Claude 系列模型，以安全性和推理能力著称。",
  lmstudio: "LM Studio 支持本地运行开源模型，提供隐私优先的推理服务。",
  moonshot: "Kimi 由 Moonshot AI 提供，支持超长上下文与深度理解。",
  zhipu: "智谱 AI 提供 GLM 系列模型，适用于编程与企业级应用。",
  ollama: "Ollama 本地运行开源模型，简单易用的 LLM 部署工具。",
}

export function getProviderIcon(name: string, className?: string): ReactNode {
  const key = name.toLowerCase()
  const IconComp = iconMap[key]
  if (IconComp) {
    return <IconComp size={24} className={className} />
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function getProviderDescription(name: string): string {
  const key = name.toLowerCase()
  return providerDescriptions[key] ?? `${name} 提供 AI 语言模型访问服务。`
}
