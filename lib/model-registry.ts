// lib/model-registry.ts

export interface RegistryModelMeta {
  name: string
  type: string
  context: string
  thinking: boolean
  vision: boolean
  video: boolean
  tools: boolean
}

// Global static model features mapping representing the industry state-of-the-art
const MODEL_REGISTRY: Record<string, RegistryModelMeta> = {
  // OpenAI Models
  "gpt-4o": { name: "GPT-4o", type: "文本", context: "128000", thinking: false, vision: true, video: false, tools: true },
  "gpt-4o-mini": { name: "GPT-4o Mini", type: "文本", context: "128000", thinking: false, vision: true, video: false, tools: true },
  "o1": { name: "OpenAI o1", type: "文本", context: "200000", thinking: true, vision: true, video: false, tools: true },
  "o1-mini": { name: "OpenAI o1 Mini", type: "文本", context: "128000", thinking: true, vision: false, video: false, tools: true },
  "o3-mini": { name: "OpenAI o3 Mini", type: "文本", context: "200000", thinking: true, vision: false, video: false, tools: true },
  "gpt-4-turbo": { name: "GPT-4 Turbo", type: "文本", context: "128000", thinking: false, vision: true, video: false, tools: true },
  "gpt-4": { name: "GPT-4", type: "文本", context: "8192", thinking: false, vision: false, video: false, tools: true },
  "gpt-3.5-turbo": { name: "GPT-3.5 Turbo", type: "文本", context: "16385", thinking: false, vision: false, video: false, tools: true },

  // Anthropic Claude
  "claude-3-5-sonnet": { name: "Claude 3.5 Sonnet", type: "文本", context: "200000", thinking: false, vision: true, video: false, tools: true },
  "claude-3-5-haiku": { name: "Claude 3.5 Haiku", type: "文本", context: "200000", thinking: false, vision: false, video: false, tools: true },
  "claude-3-opus": { name: "Claude 3 Opus", type: "文本", context: "200000", thinking: false, vision: true, video: false, tools: true },
  "claude-3-sonnet": { name: "Claude 3 Sonnet", type: "文本", context: "200000", thinking: false, vision: true, video: false, tools: true },
  "claude-3-haiku": { name: "Claude 3 Haiku", type: "文本", context: "200000", thinking: false, vision: true, video: false, tools: true },

  // Google Gemini
  "gemini-3.5-flash": { name: "Gemini 3.5 Flash", type: "文本", context: "1000000", thinking: false, vision: true, video: true, tools: true },
  "gemini-3.5-pro": { name: "Gemini 3.5 Pro", type: "文本", context: "2000000", thinking: false, vision: true, video: true, tools: true },
  "gemini-3.1-flash": { name: "Gemini 3.1 Flash", type: "文本", context: "1000000", thinking: false, vision: true, video: true, tools: true },
  "gemini-3.1-pro": { name: "Gemini 3.1 Pro", type: "文本", context: "2000000", thinking: false, vision: true, video: true, tools: true },
  "gemini-2.5-flash": { name: "Gemini 2.5 Flash", type: "文本", context: "1000000", thinking: false, vision: true, video: true, tools: true },
  "gemini-2.5-pro": { name: "Gemini 2.5 Pro", type: "文本", context: "2000000", thinking: false, vision: true, video: true, tools: true },
  "gemini-1.5-flash": { name: "Gemini 1.5 Flash", type: "文本", context: "1000000", thinking: false, vision: true, video: true, tools: true },
  "gemini-1.5-pro": { name: "Gemini 1.5 Pro", type: "文本", context: "2000000", thinking: false, vision: true, video: true, tools: true },

  // DeepSeek
  "deepseek-chat": { name: "DeepSeek V3", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "deepseek-reasoner": { name: "DeepSeek R1", type: "文本", context: "128000", thinking: true, vision: false, video: false, tools: true },
  "deepseek-v3": { name: "DeepSeek V3", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "deepseek-r1": { name: "DeepSeek R1", type: "文本", context: "128000", thinking: true, vision: false, video: false, tools: true },

  // MiniMax
  "minimax-m2.7": { name: "MiniMax M2.7", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "minimax-m2.5": { name: "MiniMax M2.5", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "minimax-m2.1": { name: "MiniMax M2.1", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "minimax-m2": { name: "MiniMax M2", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },

  // Qwen Models
  "qwen-max": { name: "通义千问 Max", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "qwen-plus": { name: "通义千问 Plus", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "qwen-turbo": { name: "通义千问 Turbo", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "qwen-long": { name: "通义千问 Long", type: "文本", context: "1000000", thinking: false, vision: false, video: false, tools: true },
  "qwen2.5-72b-instruct": { name: "Qwen 2.5 72B", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "qwen2.5-14b-instruct": { name: "Qwen 2.5 14B", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "qwen2.5-7b-instruct": { name: "Qwen 2.5 7B", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "qwq-32b": { name: "Qwen QwQ 32B", type: "文本", context: "128000", thinking: true, vision: false, video: false, tools: true },
  "qwq-32b-preview": { name: "Qwen QwQ 32B Preview", type: "文本", context: "128000", thinking: true, vision: false, video: false, tools: true },

  // GLM Models
  "glm-5.1": { name: "GLM 5.1", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "glm-5.1-highspeed": { name: "GLM 5.1 Highspeed", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "glm-5-turbo": { name: "GLM 5 Turbo", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "glm-4.7-flash": { name: "GLM 4.7 Flash", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "glm-4": { name: "GLM 4", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "glm-4-plus": { name: "GLM 4 Plus", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "glm-4-flash": { name: "GLM 4 Flash", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },

  // Moonshot Kimi
  "moonshot-v1-8k": { name: "Kimi V1 8K", type: "文本", context: "8000", thinking: false, vision: false, video: false, tools: true },
  "moonshot-v1-32k": { name: "Kimi V1 32K", type: "文本", context: "32000", thinking: false, vision: false, video: false, tools: true },
  "moonshot-v1-128k": { name: "Kimi V1 128K", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },

  // Stepfun Models
  "step-3.7-flash": { name: "Step 3.7 Flash", type: "文本", context: "256000", thinking: false, vision: true, video: false, tools: true },
  "step-3.5-flash": { name: "Step 3.5 Flash", type: "文本", context: "256000", thinking: false, vision: true, video: false, tools: true },
  "step-2-mini": { name: "Step 2 Mini", type: "文本", context: "128000", thinking: false, vision: true, video: false, tools: true },
  "step-1o-turbo-vision": { name: "Step 1o Turbo Vision", type: "文本", context: "256000", thinking: true, vision: true, video: false, tools: true },

  // Mistral Models
  "mistral-large-latest": { name: "Mistral Large", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "pixtral-large-latest": { name: "Pixtral Large", type: "文本", context: "128000", thinking: false, vision: true, video: false, tools: true },
  "codestral-latest": { name: "Codestral", type: "文本", context: "32000", thinking: false, vision: false, video: false, tools: true },

  // Groq Accelerated Llama Models
  "llama-3.3-70b-versatile": { name: "Llama 3.3 70B", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "llama-3.1-8b-instant": { name: "Llama 3.1 8B", type: "文本", context: "128000", thinking: false, vision: false, video: false, tools: true },
  "mixtral-8x7b-32768": { name: "Mixtral 8x7B", type: "文本", context: "32768", thinking: false, vision: false, video: false, tools: true },
  "gemma2-9b-it": { name: "Gemma 2 9B", type: "文本", context: "8192", thinking: false, vision: false, video: false, tools: true },

  // X.AI Grok
  "grok-4.3": { name: "Grok 4.3", type: "文本", context: "1000000", thinking: false, vision: true, video: false, tools: true },
  "grok-build-0.1": { name: "Grok Build", type: "文本", context: "128000", thinking: false, vision: true, video: false, tools: true },
  "grok-latest": { name: "Grok Latest", type: "文本", context: "1000000", thinking: false, vision: true, video: false, tools: true },

  // Doubao
  "doubao-pro-seed-2.0": { name: "豆包 Pro Seed 2.0", type: "文本", context: "256000", thinking: false, vision: false, video: false, tools: true },
  "doubao-lite-seed-2.0": { name: "豆包 Lite Seed 2.0", type: "文本", context: "256000", thinking: false, vision: false, video: false, tools: true },
  "doubao-pro-32k": { name: "豆包 Pro 32K", type: "文本", context: "32000", thinking: false, vision: false, video: false, tools: true },
  "doubao-lite-32k": { name: "豆包 Lite 32K", type: "文本", context: "32000", thinking: false, vision: false, video: false, tools: true },
}

/**
 * Searches the static registry for detailed metadata of a model ID.
 * Supports exact match, case-insensitive match, and stripping provider prefixes.
 */
export function getModelMetaFromRegistry(modelId: string): RegistryModelMeta | null {
  const cleanId = modelId.trim().toLowerCase()
  
  // 1. Try direct lookup in registry
  if (MODEL_REGISTRY[cleanId]) return MODEL_REGISTRY[cleanId]

  // 2. Try prefix-stripped lookup (e.g. meta-llama/Llama-3.3-70B-Instruct -> llama-3.3-70b-instruct)
  // Strips directory paths and provider prefixes
  let baseId = cleanId
  if (cleanId.includes("/")) {
    baseId = cleanId.split("/").pop() || cleanId
  }

  // Common cleanup: strip ending suffixes like "-instruct", "-chat", etc.
  const normalizedId = baseId.replace(/-(instruct|chat|v\d\.\d|latest|preview)$/, "")

  // Check prefix matches in registry keys
  for (const [key, value] of Object.entries(MODEL_REGISTRY)) {
    if (key === normalizedId || normalizedId.includes(key) || key.includes(normalizedId)) {
      return value
    }
  }

  return null
}
