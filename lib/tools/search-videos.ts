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

async function searchBilibili(keyword: string, limit = 5): Promise<VideoSearchResult[]> {
  try {
    const cmd = `yt-dlp "bilisearch${limit}:${keyword}" --dump-json --no-download --flat-playlist`
    const { stdout } = await execAsync(cmd, { encoding: "utf-8" })
    if (!stdout.trim()) return []
    return stdout.trim().split("\n").map(line => {
      const d = JSON.parse(line)
      return {
        id: d.id,
        title: d.title || "未知标题",
        url: d.url || d.webpage_url || "",
        duration: d.duration ?? null,
        thumbnail: d.thumbnail ?? null,
        uploader: d.uploader ?? null,
        source: "bilibili" as const,
      }
    })
  } catch {
    return [] // 搜索失败不抛错，返回空
  }
}

async function searchYouTube(keyword: string, limit = 5): Promise<VideoSearchResult[]> {
  try {
    const cmd = `yt-dlp "ytsearch${limit}:${keyword}" --dump-json --no-download --flat-playlist`
    const { stdout } = await execAsync(cmd, { encoding: "utf-8" })
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
    return JSON.stringify({
      results,
      suggestion: "选择要导入的视频。导入后将自动下载、转写并生成摘要。",
    })
  },
})
