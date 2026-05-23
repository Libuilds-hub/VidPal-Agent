// lib/llm.ts
import { ChatOpenAI } from "@langchain/openai"
import { OpenAIEmbeddings } from "@langchain/openai"
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

// Module-level cache
let _chatModel: ChatOpenAI | null = null
let _embeddings: OpenAIEmbeddings | null = null

export async function getChatModel(): Promise<ChatOpenAI> {
  if (_chatModel) return _chatModel
  const config = await getLLMConfig()
  _chatModel = new ChatOpenAI({
    modelName: config.model,
    openAIApiKey: config.apiKey,
    configuration: { baseURL: config.baseUrl },
    temperature: 0.7,
    streaming: true,
  })
  return _chatModel
}

export async function getEmbeddings(): Promise<OpenAIEmbeddings> {
  if (_embeddings) return _embeddings
  const config = await getLLMConfig()
  _embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.apiKey,
    configuration: { baseURL: config.baseUrl },
  })
  return _embeddings
}

export function clearLLMCache(): void {
  _chatModel = null
  _embeddings = null
}
