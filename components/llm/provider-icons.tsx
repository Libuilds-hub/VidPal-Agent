import type { ReactNode } from "react"
import {
  Minimax, DeepSeek, LmStudio, Moonshot, OpenAI, Google,
  Anthropic, Zhipu, OpenRouter, Ollama,
  Qwen, SiliconCloud, Stepfun, Mistral, XAI, Doubao,
  Grok,
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
  qwen: (Qwen as any).Color,
  siliconcloud: (SiliconCloud as any).Color,
  siliconflow: (SiliconCloud as any).Color,
  stepfun: (Stepfun as any).Color,
  mistral: (Mistral as any).Color,
  "x.ai": (Grok as any).Color,
  xai: (Grok as any).Color,
  grok: (Grok as any).Color,
  doubao: (Doubao as any).Color,
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
  qwen: Qwen as any,
  siliconcloud: SiliconCloud as any,
  siliconflow: SiliconCloud as any,
  stepfun: Stepfun as any,
  mistral: Mistral as any,
  "x.ai": Grok as any,
  xai: Grok as any,
  grok: Grok as any,
  doubao: Doubao as any,
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
  kimi: "Kimi 由 Moonshot AI 提供，支持超长上下文与深度理解。",
  zhipu: "智谱 AI 提供 GLM 系列模型，适用于编程与企业级应用。",
  ollama: "Ollama 本地运行开源模型，简单易用的 LLM 部署工具。",
  qwen: "通义千问由阿里云提供，在中文对话、逻辑推理与代码生成上表现优异。",
  siliconcloud: "硅基流动提供极速、高性价比的开源模型（如 DeepSeek、Qwen）托管推理服务。",
  stepfun: "阶跃星辰专注于研发多模态大模型，具备出色的上下文理解与推理能力。",
  mistral: "Mistral AI 是来自欧洲的开源大模型先锋，以轻量、高效和强大的推理性能闻名。",
  "x.ai": "X.AI 由埃隆·马斯克创立，其 Grok 模型具备实时访问社交平台信息与强烈的个性特质。",
  xai: "X.AI 由埃隆·马斯克创立，其 Grok 模型具备实时访问社交平台信息与强烈的个性特质。",
  grok: "Grok 是由 X.AI 开发的对话式 AI 助手，具备实时访问社交平台信息与强烈的个性特质。",
  doubao: "豆包大模型由字节跳动提供，依托火山方舟平台提供高并发、高性价比的推理服务。",
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
  shape: "square" | "circle" = "square",
  logo?: string | null
): ReactNode {
  if (logo) {
    return (
      <div
        className={`${
          shape === "circle" ? "rounded-full" : "rounded-md"
        } overflow-hidden border border-border bg-background flex items-center justify-center shrink-0`}
        style={{ width: size, height: size }}
      >
        <img
          src={logo}
          className={`w-full h-full object-cover ${shape === "circle" ? "scale-[1.2]" : ""}`}
          alt={name}
        />
      </div>
    )
  }
  const key = name.toLowerCase()
  const IconComp = monoIconMap[key]
  if (IconComp && (IconComp as any).Avatar) {
    const AvatarComp = (IconComp as any).Avatar
    return (
      <div
        className={`${
          shape === "circle" ? "rounded-full" : "rounded-md"
        } overflow-hidden border border-border bg-background flex items-center justify-center shrink-0`}
        style={{ width: size, height: size }}
      >
        <AvatarComp size={size - 2} shape={shape} />
      </div>
    )
  }
  const firstLetter = name ? name.charAt(0).toUpperCase() : "?"
  return (
    <div
      className={`${
        shape === "circle" ? "rounded-full" : "rounded"
      } flex items-center justify-center font-semibold select-none text-[10px] bg-muted-foreground/10 border border-border/40 text-muted-foreground shrink-0`}
      style={{ width: size, height: size }}
    >
      {firstLetter}
    </div>
  )
}

export function getProviderHeader(
  name: string,
  size: number = 36,
  logo?: string | null
): ReactNode {
  const key = name.toLowerCase()
  const IconComp = monoIconMap[key]
  
  let avatarNode: ReactNode
  if (logo) {
    avatarNode = (
      <div
        className="rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <img src={logo} className="w-full h-full object-cover" alt={name} />
      </div>
    )
  } else if (IconComp && (IconComp as any).Avatar) {
    const AvatarComp = (IconComp as any).Avatar
    avatarNode = (
      <div
        className="rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <AvatarComp size={size - 4} shape="square" />
      </div>
    )
  } else {
    const firstLetter = name ? name.charAt(0).toUpperCase() : "?"
    avatarNode = (
      <div
        className="rounded flex items-center justify-center font-semibold select-none bg-muted-foreground/10 border border-border/40 text-muted-foreground animate-in fade-in shrink-0"
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
