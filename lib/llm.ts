// lib/llm.ts
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { prisma } from "./db"

export class LLMNotConfiguredError extends Error {
  constructor() {
    super("LLM API Key 未配置")
    this.name = "LLMNotConfiguredError"
  }
}

interface LLMConfig {
  provider: "minimax" | "deepseek"
  apiKey: string
  model: string
  baseUrl: string
}

async function getLLMConfig(): Promise<LLMConfig> {
  const settings = await prisma.setting.findMany()
  const map: Record<string, string> = {}
  settings.forEach((s) => { map[s.key] = s.value })

  const provider = (map.llmProvider || "minimax") as "minimax" | "deepseek"
  const apiKey = map.llmApiKey
  const model = map.llmModel || (provider === "deepseek" ? "deepseek-v4-flash" : "MiniMax-M2.7")

  if (!apiKey) throw new LLMNotConfiguredError()

  const baseUrl = provider === "deepseek"
    ? "https://api.deepseek.com"
    : "https://api.minimaxi.com/v1"

  return { provider, apiKey, model, baseUrl }
}

// Module-level cache with promise-based dedup to prevent race conditions
let _chatModel: ChatOpenAI | null = null
let _chatModelPromise: Promise<ChatOpenAI> | null = null
let _embeddings: OpenAIEmbeddings | null = null
let _embeddingsPromise: Promise<OpenAIEmbeddings> | null = null

export async function getChatModel(modelOverride?: string): Promise<ChatOpenAI> {
  // When model is overridden, create a fresh instance (don't cache)
  if (modelOverride) {
    const config = await getLLMConfig()
    return new ChatOpenAI({
      modelName: modelOverride,
      apiKey: config.apiKey,
      configuration: { baseURL: config.baseUrl },
      temperature: 0.7,
      streaming: true,
    })
  }

  if (_chatModel) return _chatModel
  if (!_chatModelPromise) {
    _chatModelPromise = (async () => {
      const config = await getLLMConfig()
      _chatModel = new ChatOpenAI({
        modelName: config.model,
        apiKey: config.apiKey,
        configuration: { baseURL: config.baseUrl },
        temperature: 0.7,
        streaming: true,
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
      const config = await getLLMConfig()
      _embeddings = new OpenAIEmbeddings({
        apiKey: config.apiKey,
        configuration: { baseURL: config.baseUrl },
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
