// lib/llm.ts
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { prisma } from "./db"

export class LLMNotConfiguredError extends Error {
  constructor() {
    super("LLM API Key 未配置，请先在设置中添加 AI 供应商")
    this.name = "LLMNotConfiguredError"
  }
}

export interface LlmProviderInfo {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  models: string
  isDefault: boolean
  enableThinking: boolean
}

async function migrateOldSettings(): Promise<void> {
  const existing = await prisma.llmProvider.count()
  if (existing > 0) return

  const settings = await prisma.setting.findMany()
  const map: Record<string, string> = {}
  settings.forEach((s) => { map[s.key] = s.value })

  const apiKey = map.llmApiKey
  if (!apiKey) return

  const provider = map.llmProvider || "minimax"
  const baseUrls: Record<string, string> = {
    minimax: "https://api.minimaxi.com/v1",
    deepseek: "https://api.deepseek.com",
    openrouter: "https://openrouter.ai/api/v1",
  }
  const defaultModels: Record<string, string> = {
    minimax: "MiniMax-M2.7",
    deepseek: "deepseek-v4-flash",
    openrouter: "deepseek/deepseek-v4-flash:free",
  }

  await prisma.llmProvider.create({
    data: {
      name: provider,
      apiKey,
      baseUrl: baseUrls[provider] || baseUrls.minimax,
      models: map.llmModel || defaultModels[provider] || defaultModels.minimax,
      isDefault: true,
    },
  })
}

async function getDefaultProvider(): Promise<LlmProviderInfo> {
  await migrateOldSettings()
  const p = await prisma.llmProvider.findFirst({ where: { isDefault: true } })
  if (!p) {
    const first = await prisma.llmProvider.findFirst()
    if (!first) throw new LLMNotConfiguredError()
    return first
  }
  return p
}

async function getProviderByName(name: string): Promise<LlmProviderInfo | null> {
  await migrateOldSettings()
  // Match by exact name or case-insensitive
  const p = await prisma.llmProvider.findFirst({ where: { name } })
  if (p) return p
  // Try case-insensitive match
  return prisma.llmProvider.findFirst({
    where: { name: { equals: name } },
  }) as any  // fallback — SQLite doesn't support mode: 'insensitive', just try exact
}

// Module-level cache
let _chatModel: ChatOpenAI | null = null
let _chatModelPromise: Promise<ChatOpenAI> | null = null
let _embeddings: OpenAIEmbeddings | null = null
let _embeddingsPromise: Promise<OpenAIEmbeddings> | null = null

function buildModelKwargs(provider: LlmProviderInfo): Record<string, any> {
  const modelKwargs: Record<string, any> = {}
  
  const isDeepSeekOrOpenRouter = 
    provider.baseUrl.includes("deepseek") || 
    provider.baseUrl.includes("openrouter") ||
    provider.name.toLowerCase().includes("deepseek") ||
    provider.name.toLowerCase().includes("openrouter")

  if (isDeepSeekOrOpenRouter) {
    if (provider.enableThinking) {
      modelKwargs.reasoning_effort = "high"
      modelKwargs.extra_body = {
        thinking: { type: "enabled" }
      }
    } else {
      modelKwargs.extra_body = {
        thinking: { type: "disabled" }
      }
    }
  }
  return modelKwargs
}

export async function getChatModel(
  modelOverride?: string,
  providerName?: string,
): Promise<ChatOpenAI> {
  if (modelOverride || providerName) {
    let provider: LlmProviderInfo
    if (providerName) {
      const p = await getProviderByName(providerName)
      if (!p) {
        // Provider not found by name, fall through to default
        provider = await getDefaultProvider()
      } else {
        provider = p
      }
    } else {
      provider = await getDefaultProvider()
    }
    const modelKwargs = buildModelKwargs(provider)
    return new ChatOpenAI({
      modelName: modelOverride || provider.models.split(",")[0]?.trim() || "gpt-3.5-turbo",
      apiKey: provider.apiKey,
      configuration: { baseURL: provider.baseUrl },
      temperature: 0.7,
      streaming: true,
      modelKwargs,
    })
  }

  if (_chatModel) return _chatModel
  if (!_chatModelPromise) {
    _chatModelPromise = (async () => {
      const p = await getDefaultProvider()
      const defaultModel = p.models.split(",")[0]?.trim() || "gpt-3.5-turbo"
      const modelKwargs = buildModelKwargs(p)
      _chatModel = new ChatOpenAI({
        modelName: defaultModel,
        apiKey: p.apiKey,
        configuration: { baseURL: p.baseUrl },
        temperature: 0.7,
        streaming: true,
        modelKwargs,
      })
      return _chatModel
    })()
  }
  return _chatModelPromise
}

export async function getEmbeddings(): Promise<OpenAIEmbeddings> {
  if (_embeddings) return _embeddings
  if (!_embeddingsPromise) {
    _embeddingsPromise = (async () => {
      const p = await getDefaultProvider()
      _embeddings = new OpenAIEmbeddings({
        apiKey: p.apiKey,
        configuration: { baseURL: p.baseUrl },
      })
      return _embeddings
    })()
  }
  return _embeddingsPromise
}

export function clearLLMCache(): void {
  _chatModel = null
  _chatModelPromise = null
  _embeddings = null
  _embeddingsPromise = null
}

// For use in parse route etc. — get all providers for model selection
export async function getAllProviders(): Promise<LlmProviderInfo[]> {
  await migrateOldSettings()
  return prisma.llmProvider.findMany({ orderBy: { createdAt: "asc" } })
}
