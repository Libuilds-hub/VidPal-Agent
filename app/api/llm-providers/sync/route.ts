import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { clearRuntimeLlmCache } from "@/lib/runtime-client"

export async function POST(req: NextRequest) {
  try {
    const { providerId } = await req.json().catch(() => ({}))

    // Step 1: Find target providers
    let providersToSync = []
    if (providerId) {
      const provider = await prisma.llmProvider.findUnique({
        where: { id: providerId }
      })
      if (!provider) {
        return NextResponse.json({ error: "找不到指定的供应商" }, { status: 404 })
      }
      if (!provider.apiKey || !provider.baseUrl) {
        return NextResponse.json({ error: "供应商未配置 API Key 或请求地址，无法进行同步" }, { status: 400 })
      }
      providersToSync = [provider]
    } else {
      // Fetch all enabled providers that have an API Key configured
      providersToSync = await prisma.llmProvider.findMany({
        where: {
          enabled: true,
          apiKey: { not: "" }
        }
      })
    }

    if (providersToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: "没有需要同步的已配置供应商",
        results: []
      })
    }

    const results = []

    // Step 2: Iterate and sync each provider
    for (const provider of providersToSync) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        }

        if (provider.baseUrl.includes("openrouter.ai")) {
          headers["HTTP-Referer"] = "http://localhost:3000"
          headers["X-Title"] = "Video Shancn"
        }

        // Hitting standard /models endpoint
        // Strip trailing slash if present
        const cleanBaseUrl = provider.baseUrl.replace(/\/$/, "")
        
        // Handle native Ollama tags API if applicable
        const isOllama = provider.name.toLowerCase() === "ollama" || cleanBaseUrl.includes("127.0.0.1:11434") || cleanBaseUrl.includes("localhost:11434")
        const fetchUrl = isOllama ? `${cleanBaseUrl.replace(/\/v1$/, "")}/api/tags` : `${cleanBaseUrl}/models`

        const response = await fetch(fetchUrl, {
          method: "GET",
          headers,
          // Set a reasonable timeout of 10s
          signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
          throw new Error(`HTTP 错误 ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        let modelIds: string[] = []

        // Robust parsing of different JSON response formats
        if (isOllama && data && Array.isArray(data.models)) {
          // Ollama native response
          modelIds = data.models.map((m: any) => m.name || m.model)
        } else if (data && Array.isArray(data.data)) {
          // Standard OpenAI response format
          modelIds = data.data.map((m: any) => m.id)
        } else if (data && Array.isArray(data)) {
          // Directly array of items
          modelIds = data.map((m: any) => typeof m === "string" ? m : (m.id || m.name))
        } else if (data && typeof data === "object") {
          // Fallback formats
          const possibleArray = data.models || data.data || data.results
          if (Array.isArray(possibleArray)) {
            modelIds = possibleArray.map((m: any) => typeof m === "string" ? m : (m.id || m.name || m.model))
          }
        }

        // Clean model IDs
        const cleanModelsList = Array.from(
          new Set(
            modelIds
              .map((id) => String(id).trim())
              .filter(Boolean)
          )
        )

        if (cleanModelsList.length === 0) {
          throw new Error("云端接口未返回任何有效模型标识")
        }

        // Update in database
        const updatedModelsString = cleanModelsList.join(", ")
        await prisma.llmProvider.update({
          where: { id: provider.id },
          data: { models: updatedModelsString }
        })

        results.push({
          id: provider.id,
          name: provider.name,
          success: true,
          count: cleanModelsList.length,
          models: cleanModelsList
        })
      } catch (err: any) {
        console.error(`Syncing provider ${provider.name} failed:`, err)
        results.push({
          id: provider.id,
          name: provider.name,
          success: false,
          error: err instanceof Error ? err.message : "连接失败，无法获取模型"
        })
      }
    }

    // Step 3: Update overall last sync time setting
    await prisma.setting.upsert({
      where: { key: "last_model_sync_time" },
      update: { value: new Date().toISOString() },
      create: { key: "last_model_sync_time", value: new Date().toISOString() }
    })

    // 写操作后通知 Runtime 清除 LLM 缓存（fire-and-forget：不阻塞响应、Runtime 不可用也静默）
    void clearRuntimeLlmCache()

    return NextResponse.json({
      success: true,
      message: "同步请求处理完毕",
      results
    })
  } catch (error) {
    console.error("Models sync controller error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "内部服务器错误" },
      { status: 500 }
    )
  }
}
