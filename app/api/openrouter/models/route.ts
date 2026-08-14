import { NextResponse } from "next/server"

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 成功结果缓存 6 小时
const FAILURE_CACHE_TTL_MS = 10 * 60 * 1000 // 失败结果缓存 10 分钟，避免每次访问都等待超时
const FETCH_TIMEOUT_MS = 15000

let cachedData: { data: unknown[] } | null = null
let cachedAt = 0
let cachedError: string | null = null
let cachedErrorAt = 0

export const dynamic = "force-dynamic"

/**
 * 代理 OpenRouter 全局模型库。
 * 浏览器直连 openrouter.ai 会因 CORS / 网络可达性失败，
 * 改由服务端请求，避免跨域问题并统一超时与缓存。
 */
export async function GET() {
  const now = Date.now()
  if (cachedData && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedData, {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  }
  // 网络不可达时短期内直接返回失败，避免每次进入页面都等待超时
  if (cachedError && now - cachedErrorAt < FAILURE_CACHE_TTL_MS) {
    return NextResponse.json({ error: cachedError }, { status: 502 })
  }

  try {
    const res = await fetch(OPENROUTER_MODELS_URL, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      const msg = `OpenRouter 接口返回 HTTP ${res.status}`
      cachedError = msg
      cachedErrorAt = now
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await res.json()
    if (!data || !Array.isArray(data.data)) {
      const msg = "OpenRouter 接口返回的数据格式不正确"
      cachedError = msg
      cachedErrorAt = now
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    cachedData = data
    cachedAt = now
    cachedError = null
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  } catch (err) {
    // 网络不可达等场景：记录到服务端日志，客户端侧会静默降级
    console.error("[openrouter/models] 获取模型库失败:", err)
    const msg = err instanceof Error ? err.message : "无法连接 OpenRouter"
    cachedError = msg
    cachedErrorAt = now
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
