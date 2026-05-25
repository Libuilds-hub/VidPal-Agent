"use client"

import { useState, useMemo } from "react"
import { Circle, CheckCircle2, Play, Clock, User, EyeIcon, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoItem {
  id: string
  title: string
  url: string
  thumbnail: string | null
  uploader: string | null
  play: number | null
  duration: number | null
  source: string
}

function formatDuration(sec: number | null): string {
  if (sec == null) return ""
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatPlay(n: number | null): string {
  if (n == null) return ""
  if (n >= 10000) return (n / 10000).toFixed(1) + "万播放"
  return String(n) + "播放"
}

interface VideoPickCardsProps {
  videos: VideoItem[]
  onImport?: (urls: string[]) => void
}

export function VideoPickCards({ videos, onImport }: VideoPickCardsProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (videos.length === 0) return null

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleStart = () => {
    const urls = videos
      .filter((_, i) => selected.has(i))
      .map((v) => v.url)
      .filter(Boolean)
    if (urls.length > 0) onImport?.(urls)
    setSelected(new Set())
  }

  return (
    <div className="space-y-2 mt-1 mb-1">
      <div className="text-[9px] text-muted-foreground/30 font-medium tracking-wide uppercase">
        推荐视频
      </div>
      {videos.map((v, i) => {
        const isSelected = selected.has(i)
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-150 group/card",
              isSelected
                ? "bg-primary/[0.04] border-primary/20"
                : "bg-card/60 border-border/20 hover:border-border/40"
            )}
          >
            {/* Thumbnail */}
            <a
              href={v.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-16 h-10 rounded-md bg-muted/60 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden group/img"
            >
              <Search className="h-3 w-3 text-muted-foreground/25" />
              {v.thumbnail && (
                <img
                  src={v.thumbnail}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/img:opacity-100 transition-opacity"
                  onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = "1" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              )}
            </a>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <a
                href={v.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-foreground/80 font-medium leading-snug line-clamp-2 hover:text-primary/80 transition-colors"
              >
                {v.title || "未知标题"}
              </a>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/45">
                {v.uploader && (
                  <span className="inline-flex items-center gap-0.5">
                    <User className="h-2.5 w-2.5" />
                    {v.uploader}
                  </span>
                )}
                {v.play != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <EyeIcon className="h-2.5 w-2.5" />
                    {formatPlay(v.play)}
                  </span>
                )}
                {v.duration != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDuration(v.duration)}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-px rounded font-medium",
                    v.source === "bilibili"
                      ? "bg-pink-500/10 text-pink-500/70"
                      : "bg-red-500/10 text-red-500/70"
                  )}
                >
                  {v.source === "bilibili" ? "B站" : "YouTube"}
                </span>
              </div>
            </div>

            {/* Checkbox */}
            <button
              onClick={() => toggle(i)}
              className="mt-1 shrink-0 cursor-pointer"
            >
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 text-primary/80" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/20 group-hover/card:text-muted-foreground/40 transition-colors" />
              )}
            </button>
          </div>
        )
      })}

      {selected.size > 0 && (
        <button
          onClick={handleStart}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          <Play className="h-3.5 w-3.5" />
          开始分析（{selected.size}）
        </button>
      )}
    </div>
  )
}

/** Extract video items from searchVideos results, filtered to those mentioned in the LLM's response */
export function extractVideosFromToolEvents(
  events: { name: string; result?: string }[],
  messageContent?: string,
): VideoItem[] {
  let allVideos: VideoItem[] = []
  for (const ev of events) {
    if (ev.name !== "searchVideos" || !ev.result) continue
    try {
      const data = JSON.parse(ev.result)
      if (data.results && Array.isArray(data.results)) {
        allVideos = data.results as VideoItem[]
      }
    } catch {}
  }
  if (allVideos.length === 0) return []

  // No message content → no LLM recommendation yet → show nothing
  if (!messageContent || messageContent.trim().length === 0) return []

  // Match videos mentioned in the LLM's response by URL, BV/AV ID, or title substring
  const text = messageContent.toLowerCase()
  const mentioned = allVideos.filter((v) => {
    const url = (v.url || "").toLowerCase()
    const id = (v.id || "").toLowerCase()
    const title = (v.title || "").toLowerCase()

    // Check if any part of the video appears in the message
    if (url && text.includes(url)) return true
    if (id && id.length > 3 && text.includes(id)) return true
    // Title match: at least 8 consecutive chars from title appear in message
    if (title.length >= 8) {
      for (let i = 0; i <= title.length - 8; i++) {
        if (text.includes(title.slice(i, i + 8))) return true
      }
    }
    return false
  })

  return mentioned
}
