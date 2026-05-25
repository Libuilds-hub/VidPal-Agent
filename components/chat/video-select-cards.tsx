"use client"

import { useState, useMemo } from "react"
import { Circle, CheckCircle2, Play, Clock, User, EyeIcon, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolEvent } from "./tool-panel"

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

interface VideoSelectCardsProps {
  toolEvents: ToolEvent[]
  onImport?: (urls: string[]) => void
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
  return n + "播放"
}

export function VideoSelectCards({ toolEvents, onImport }: VideoSelectCardsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const videos = useMemo(() => {
    // Get the last completed searchVideos result
    const svEvents = toolEvents.filter(
      (ev) => ev.name === "searchVideos" && ev.status === "done" && ev.result
    )
    if (svEvents.length === 0) return []
    const last = svEvents[svEvents.length - 1]
    try {
      const data = JSON.parse(last.result!)
      return (data.results || []) as VideoItem[]
    } catch {
      return []
    }
  }, [toolEvents])

  if (videos.length === 0) return null

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === videos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(videos.map((v) => v.id).filter(Boolean)))
    }
  }

  const handleStart = () => {
    const urls = videos
      .filter((v) => selected.has(v.id))
      .map((v) => v.url)
      .filter(Boolean)
    if (urls.length > 0) onImport?.(urls)
  }

  return (
    <div className="space-y-1.5 mt-2 mb-2">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-[10px] font-semibold text-muted-foreground/50 tracking-wide">
          推荐视频
        </span>
        <button
          onClick={toggleAll}
          className={cn(
            "text-[10px] text-muted-foreground/35 hover:text-muted-foreground/70 transition-colors",
            selected.size > 0 && selected.size === videos.length && "text-primary/60"
          )}
        >
          {selected.size > 0 && selected.size === videos.length ? "取消全选" : "全选"}
        </button>
        {selected.size > 0 && (
          <span className="text-[9px] text-muted-foreground/30 ml-auto">
            已选 {selected.size} 个
          </span>
        )}
      </div>

      {videos.map((v) => {
        const isSelected = selected.has(v.id)
        return (
          <div
            key={v.id}
            className={cn(
              "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-150 group/card",
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
              className="relative w-[88px] h-[50px] rounded-md bg-muted/60 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden group/img"
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
            <div className="flex-1 min-w-0 py-px">
              <a
                href={v.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-foreground/80 font-medium leading-snug line-clamp-2 hover:text-primary/80 transition-colors"
              >
                {v.title || "未知标题"}
              </a>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground/45">
                {v.uploader && (
                  <span className="inline-flex items-center gap-0.5">
                    <User className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate max-w-[100px]">{v.uploader}</span>
                  </span>
                )}
                {v.play != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <EyeIcon className="h-2.5 w-2.5 shrink-0" />
                    {formatPlay(v.play)}
                  </span>
                )}
                {v.duration != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5 shrink-0" />
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
              onClick={() => toggle(v.id)}
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
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          <Play className="h-3.5 w-3.5" />
          开始分析（{selected.size}）
        </button>
      )}
    </div>
  )
}
