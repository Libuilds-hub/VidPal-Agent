// lib/tools/search-videos.ts
import { DynamicTool } from "@langchain/core/tools"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface VideoSearchResult {
  id: string
  title: string
  url: string
  duration: number | null
  thumbnail: string | null
  uploader: string | null
  source: "bilibili" | "youtube"
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim()
}

async function searchBilibili(keyword: string, limit = 5): Promise<VideoSearchResult[]> {
  const url = `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?keyword=${encodeURIComponent(keyword)}&page=1`
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://www.bilibili.com",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    if (json.code !== 0) return []

    const videoResults = (json.data?.result || [])
      .filter((r: { result_type: string }) => r.result_type === "video")
      .flatMap((r: { data?: unknown[] }) => r.data || [])

    return videoResults.slice(0, limit).map((v: Record<string, unknown>) => ({
      id: String(v.bvid || v.aid || ""),
      title: stripHtml(String(v.title || "未知标题")),
      url: String(v.arcurl || (v.bvid ? `https://www.bilibili.com/video/${v.bvid}` : "")),
      duration: typeof v.duration === "string" ? parseDuration(v.duration) : null,
      thumbnail: String(v.pic || "").startsWith("//") ? "https:" + v.pic : String(v.pic || ""),
      uploader: String(v.author || ""),
      source: "bilibili" as const,
    }))
  } catch {
    return []
  }
}

function parseDuration(d: string): number {
  // "HH:MM:SS" or "MM:SS" → seconds
  const parts = d.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

async function searchYouTube(keyword: string, limit = 5): Promise<VideoSearchResult[]> {
  try {
    const cmd = `yt-dlp "ytsearch${limit}:${keyword}" --dump-json --no-download --flat-playlist --socket-timeout 10`
    const { stdout } = await execAsync(cmd, { encoding: "utf-8", timeout: 15000 })
    if (!stdout.trim()) return []
    return stdout.trim().split("\n").map(line => {
      const d = JSON.parse(line)
      return {
        id: d.id,
        title: d.title || "未知标题",
        url: d.url || d.webpage_url || "",
        duration: d.duration ?? null,
        thumbnail: d.thumbnail ?? null,
        uploader: d.uploader || d.channel || null,
        source: "youtube" as const,
      }
    })
  } catch {
    return []
  }
}

export const searchVideosTool = new DynamicTool({
  name: "searchVideos",
  description:
    "在B站和YouTube上搜索学习视频。当用户想找某个主题的视频时使用。" +
    "参数: keyword(必填,搜索关键词), source(选填:bilibili/youtube/all,默认all), count(选填,返回数量,默认5)",
  func: async (input: string) => {
    const { keyword, source = "all", count = 5 } = JSON.parse(input)
    const tasks: Promise<VideoSearchResult[]>[] = []
    if (source !== "youtube") tasks.push(searchBilibili(keyword, count))
    if (source !== "bilibili") tasks.push(searchYouTube(keyword, count))
    const settled = await Promise.allSettled(tasks)
    const results = settled
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<VideoSearchResult[]>).value)

    const errors: string[] = []
    if (source !== "youtube" && settled[0]?.status === "rejected") errors.push("B站搜索失败")
    if (source !== "bilibili") {
      const ytIdx = source === "youtube" ? 0 : 1
      if (settled[ytIdx]?.status === "rejected") errors.push("YouTube搜索不可用")
    }

    return JSON.stringify({
      results,
      keyword,
      ...(errors.length > 0 && { warnings: errors }),
      suggestion: results.length > 0
        ? "选择要导入的视频。导入后将自动下载、转写并生成摘要。"
        : "未找到相关视频，建议换个关键词重试。",
    })
  },
})
