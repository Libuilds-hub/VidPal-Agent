import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { clearRuntimeLlmCache } from "@/lib/runtime-client"

// GET — list all providers (return unmasked keys)
export async function GET() {
  const providers = await prisma.llmProvider.findMany({
    orderBy: { createdAt: "asc" },
  })

  // Automatically rename "Moonshot" provider to "Kimi" and update its default models in the database if they need update
  const kimiProvider = providers.find(p => p.name === "Kimi" || p.name === "Moonshot")
  if (kimiProvider) {
    const needRename = kimiProvider.name === "Moonshot"
    const needModelsUpdate = !kimiProvider.models.includes("kimi-k2.6")
    
    if (needRename || needModelsUpdate) {
      let newModels = kimiProvider.models
      if (needModelsUpdate) {
        // Prepend the new kimi-k2.6 and kimi-k2.5 models if they are not in the list
        const defaultModels = ["kimi-k2.6", "kimi-k2.5"]
        const existingList = kimiProvider.models.split(",").map(m => m.trim()).filter(Boolean)
        const updatedList = Array.from(new Set([...defaultModels, ...existingList]))
        newModels = updatedList.join(", ")
      }
      
      await prisma.llmProvider.update({
        where: { id: kimiProvider.id },
        data: { 
          name: "Kimi",
          models: newModels
        }
      })
      // Reload providers after update
      return NextResponse.json(await prisma.llmProvider.findMany({
        orderBy: { createdAt: "asc" }
      }))
    }
  }

  // Get the last sync timestamp
  const lastSyncSetting = await prisma.setting.findUnique({
    where: { key: "last_model_sync_time" }
  })

  // Trigger background automatic daily sync if more than 24 hours passed (or never synced)
  const now = Date.now()
  const lastSync = lastSyncSetting ? new Date(lastSyncSetting.value).getTime() : 0
  const isOlderThanOneDay = now - lastSync > 24 * 60 * 60 * 1000

  if (isOlderThanOneDay) {
    // Start background sync asynchronously without awaiting it so as not to block initial load
    (async () => {
      try {
        console.log("Triggering auto background LLM models sync...")
        const providersToSync = await prisma.llmProvider.findMany({
          where: {
            enabled: true,
            apiKey: { not: "" }
          }
        })

        if (providersToSync.length > 0) {
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

              const cleanBaseUrl = provider.baseUrl.replace(/\/$/, "")
              const isOllama = provider.name.toLowerCase() === "ollama" || cleanBaseUrl.includes("127.0.0.1:11434") || cleanBaseUrl.includes("localhost:11434")
              const fetchUrl = isOllama ? `${cleanBaseUrl.replace(/\/v1$/, "")}/api/tags` : `${cleanBaseUrl}/models`

              const res = await fetch(fetchUrl, {
                method: "GET",
                headers,
                signal: AbortSignal.timeout(10000)
              })

              if (res.ok) {
                const data = await res.json()
                let modelIds: string[] = []

                if (isOllama && data && Array.isArray(data.models)) {
                  modelIds = data.models.map((m: any) => m.name || m.model)
                } else if (data && Array.isArray(data.data)) {
                  modelIds = data.data.map((m: any) => m.id)
                } else if (data && Array.isArray(data)) {
                  modelIds = data.map((m: any) => typeof m === "string" ? m : (m.id || m.name))
                } else if (data && typeof data === "object") {
                  const possibleArray = data.models || data.data || data.results
                  if (Array.isArray(possibleArray)) {
                    modelIds = possibleArray.map((m: any) => typeof m === "string" ? m : (m.id || m.name || m.model))
                  }
                }

                const cleanModelsList = Array.from(new Set(modelIds.map(id => String(id).trim()).filter(Boolean)))
                if (cleanModelsList.length > 0) {
                  await prisma.llmProvider.update({
                    where: { id: provider.id },
                    data: { models: cleanModelsList.join(", ") }
                  })
                  console.log(`Auto background sync succeeded for: ${provider.name} (${cleanModelsList.length} models)`)
                }
              }
            } catch (err) {
              console.error(`Auto background sync failed for ${provider.name}:`, err)
            }
          }

          // Update timestamp
          await prisma.setting.upsert({
            where: { key: "last_model_sync_time" },
            update: { value: new Date().toISOString() },
            create: { key: "last_model_sync_time", value: new Date().toISOString() }
          })
        }
      } catch (bgError) {
        console.error("Error executing background models sync:", bgError)
      }
    })()
  }

  return NextResponse.json(providers, {
    headers: {
      "X-Last-Model-Sync-Time": lastSyncSetting?.value || ""
    }
  })
}

// POST — create a new provider
export async function POST(req: NextRequest) {
  const { name, apiKey, baseUrl, models, isDefault, enableThinking, enabled, logo } = await req.json()
  if (!name || !apiKey || !baseUrl) {
    return NextResponse.json({ error: "名称、API Key 和 Base URL 为必填项" }, { status: 400 })
  }

  // If this is set as default, unset other defaults
  if (isDefault) {
    await prisma.llmProvider.updateMany({ data: { isDefault: false } })
  }

  const provider = await prisma.llmProvider.create({
    data: { 
      name, 
      apiKey, 
      baseUrl, 
      models: models || "", 
      isDefault: !!isDefault,
      enableThinking: enableThinking !== undefined ? !!enableThinking : true,
      enabled: enabled !== undefined ? !!enabled : true,
      logo: logo || null,
    },
  })

  // 写操作后通知 Runtime 清除 LLM 缓存（fire-and-forget：不阻塞响应、Runtime 不可用也静默）
  void clearRuntimeLlmCache()

  return NextResponse.json(provider)
}

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "****"
  return key.slice(0, 4) + "****" + key.slice(-4)
}
