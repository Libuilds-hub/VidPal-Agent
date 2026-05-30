import type { ReactNode } from "react"
import {
  Minimax, DeepSeek, LmStudio, Moonshot, OpenAI, Google,
  Anthropic, Zhipu, OpenRouter, Ollama, Groq, Together,
} from "@lobehub/icons"

type IconComponent = React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>

/* eslint-disable @typescript-eslint/no-explicit-any */
const colorIconMap: Record<string, IconComponent> = {
  minimax: (Minimax as any).Color,
  deepseek: (DeepSeek as any).Color,
  lmstudio: (LmStudio as any).Color,
  moonshot: (Moonshot as any).Color,
  kimi: (Moonshot as any).Color,
  openai: (OpenAI as any).Color,
  google: (Google as any).Color,
  gemini: (Google as any).Color,
  anthropic: (Anthropic as any).Color,
  claude: (Anthropic as any).Color,
  zhipu: (Zhipu as any).Color,
  glm: (Zhipu as any).Color,
  chatglm: (Zhipu as any).Color,
  openrouter: (OpenRouter as any).Color,
  ollama: (Ollama as any).Color,
  groq: (Groq as any).Color,
  together: (Together as any).Color,
}

const monoIconMap: Record<string, IconComponent> = {
  minimax: Minimax as any,
  deepseek: DeepSeek as any,
  lmstudio: LmStudio as any,
  moonshot: Moonshot as any,
  kimi: Moonshot as any,
  openai: OpenAI as any,
  google: Google as any,
  gemini: Google as any,
  anthropic: Anthropic as any,
  claude: Anthropic as any,
  zhipu: Zhipu as any,
  glm: Zhipu as any,
  chatglm: Zhipu as any,
  openrouter: OpenRouter as any,
  ollama: Ollama as any,
  groq: Groq as any,
  together: Together as any,
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
  groq: "Groq 提供高性能推理芯片与 LPU 加速的 AI 服务。",
  together: "Together AI 提供开源模型的云端推理与微调服务。",
}

function getIcon(name: string, map: Record<string, IconComponent>): ReactNode {
  const key = name.toLowerCase()
  const IconComp = map[key]
  if (IconComp) {
    return <IconComp size={24} />
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function getProviderIcon(name: string, className?: string): ReactNode {
  return getIcon(name, monoIconMap)
}

export function getProviderIconColor(name: string): ReactNode {
  return getIcon(name, colorIconMap)
}

export function getProviderAvatar(
  name: string,
  size: number = 20,
  shape: "square" | "circle" = "square"
): ReactNode {
  const key = name.toLowerCase()
  const IconComp = monoIconMap[key]
  if (IconComp && (IconComp as any).Avatar) {
    const AvatarComp = (IconComp as any).Avatar
    return <AvatarComp size={size} shape={shape} />
  }
  const firstLetter = name ? name.charAt(0).toUpperCase() : "?"
  return (
    <div
      className={`${
        shape === "circle" ? "rounded-full" : "rounded"
      } flex items-center justify-center font-semibold select-none text-[10px] bg-muted-foreground/10 border border-border/40 text-muted-foreground`}
      style={{ width: size, height: size }}
    >
      {firstLetter}
    </div>
  )
}

export function getProviderHeader(name: string, size: number = 36): ReactNode {
  const key = name.toLowerCase()
  const IconComp = monoIconMap[key]
  
  let avatarNode: ReactNode
  if (IconComp && (IconComp as any).Avatar) {
    const AvatarComp = (IconComp as any).Avatar
    avatarNode = <AvatarComp size={size} shape="square" />
  } else {
    const firstLetter = name ? name.charAt(0).toUpperCase() : "?"
    avatarNode = (
      <div
        className="rounded flex items-center justify-center font-semibold select-none bg-muted-foreground/10 border border-border/40 text-muted-foreground animate-in fade-in"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {firstLetter}
      </div>
    )
  }

  let textNode: ReactNode
  if (IconComp && (IconComp as any).Text) {
    const TextComp = (IconComp as any).Text
    textNode = <TextComp size={size * 0.75} />
  } else {
    textNode = <h1 className="text-xl font-semibold text-foreground/95">{name}</h1>
  }

  return (
    <div className="flex items-center gap-3.5 animate-in fade-in slide-in-from-left-2 duration-200">
      {avatarNode}
      {textNode}
    </div>
  )
}

export function getProviderDescription(name: string): string {
  const key = name.toLowerCase()
  return providerDescriptions[key] ?? `${name} 提供 AI 语言模型访问服务。`
}
