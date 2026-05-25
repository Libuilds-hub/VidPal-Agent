"use client"

import { useState } from "react"
import {
  ChevronDown, Wrench, Search, Eye, Download, FileSearch,
  Circle, CheckCircle2, Play, Clock, User, EyeIcon, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToolEvent {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  status: "running" | "done"
}

interface ToolPanelProps {
  events: ToolEvent[]
  onImport?: (urls: string[]) => void
}

const TOOL_META: Record<string, { icon: typeof Search; label: string; color: string }> = {
  searchVideos: { icon: Search, label: "搜索视频", color: "text-sky-500" },
  searchTranscripts: { icon: FileSearch, label: "语义检索", color: "text-violet-500" },
  getVideoContext: { icon: Eye, label: "查看摘要", color: "text-emerald-500" },
  importVideo: { icon: Download, label: "导入视频", color: "text-orange-500" },
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
  if (n >= 10000) return (n / 10000).toFixed(1) + "万"
  return String(n)
}

function formatArgValue(v: unknown): string {
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)
  if (Array.isArray(v)) return v.map(String).join("、")
  return JSON.stringify(v)
}

function ToolArgsBadges({ name, args }: { name: string; args: Record<string, unknown> }) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] bg-muted/60 border border-border/30 text-foreground/70 font-medium truncate max-w-[240px]">
        {String(args)}
      </span>
    )
  }
  const displayArgs = Object.entries(args).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  )
  if (displayArgs.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {displayArgs.map(([key, val]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] bg-muted/60 border border-border/30 text-muted-foreground/60"
        >
          <span className="text-muted-foreground/40">{key}</span>
          <span className="text-foreground/70 font-medium truncate max-w-[160px]">
            {formatArgValue(val)}
          </span>
        </span>
      ))}
    </div>
  )
}

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

function SearchResultCards({ result, onImport }: { result: string; onImport?: (urls: string[]) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  let videos: VideoItem[] = []
  try {
    const data = JSON.parse(result)
    if (data.results && Array.isArray(data.results)) {
      videos = data.results
    }
  } catch {
    return (
      <pre className="text-[10px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto m-0 select-text">
        {result.length > 300 ? result.slice(0, 300) + "..." : result}
      </pre>
    )
  }

  if (videos.length === 0) {
    return <div className="text-[10px] text-muted-foreground/40 py-1">未找到相关视频</div>
  }

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === videos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(videos.map((_, i) => i)))
    }
  }

  const handleStart = () => {
    const urls = videos
      .filter((_, i) => selected.has(i))
      .map((v) => v.url)
      .filter(Boolean)
    if (urls.length > 0) onImport?.(urls)
  }

  return (
    <div className="space-y-0.5">
      {/* Select all row */}
      <div className="flex items-center gap-2 pb-1">
        <button
          onClick={toggleAll}
          className={cn(
            "text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors",
            selected.size === videos.length && "text-primary/60 hover:text-primary/80"
          )}
        >
          {selected.size === videos.length ? "取消全选" : "全选"}
        </button>
        <span className="text-[9px] text-muted-foreground/25">
          {selected.size > 0 ? `已选 ${selected.size} 个` : ""}
        </span>
      </div>

      {/* Video cards */}
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
              className="relative w-14 h-9 rounded-md bg-muted/60 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden group/img"
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
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/45">
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

            {/* Checkbox + external link */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => toggle(i)}
                className="mt-0.5 cursor-pointer"
              >
                {isSelected ? (
                  <CheckCircle2 className="h-4 w-4 text-primary/80" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/20 group-hover/card:text-muted-foreground/40 transition-colors" />
                )}
              </button>
              <a
                href={v.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )
      })}

      {/* Start button */}
      {selected.size > 0 && (
        <button
          onClick={handleStart}
          className="flex items-center justify-center gap-2 w-full mt-2 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          <Play className="h-3.5 w-3.5" />
          开始分析（{selected.size}）
        </button>
      )}
    </div>
  )
}

export function ToolPanel({ events, onImport }: ToolPanelProps) {
  if (events.length === 0) return null
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const meta = TOOL_META[ev.name] || { icon: Wrench, label: ev.name, color: "text-muted-foreground/50" }
        const Icon = meta.icon
        const isCollapsed = collapsed.has(ev.id)

        return (
          <div
            key={ev.id}
            className="rounded-lg border border-border/30 bg-card/50 overflow-hidden transition-all duration-200"
          >
            {/* Header bar */}
            <button
              onClick={() => toggle(ev.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/20 transition-colors"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                {ev.status === "running" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400/60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                  </>
                ) : (
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400/80" />
                )}
              </span>
              <Icon className={cn("h-3 w-3 shrink-0", meta.color)} />
              <span className="text-[11px] font-medium text-foreground/70">{meta.label}</span>
              {ev.status === "running" && (
                <span className="text-[10px] text-muted-foreground/40 ml-1 truncate">
                  {Object.values(ev.args).filter(v => v).map(String).join(" · ").slice(0, 40)}
                </span>
              )}
              <span className="ml-auto text-[9px] text-muted-foreground/30">
                {ev.status === "running" ? "执行中" : "已完成"}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground/30 transition-transform duration-200",
                  !isCollapsed && "rotate-180"
                )}
              />
            </button>

            {/* Expanded body */}
            {!isCollapsed && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/10">
                <ToolArgsBadges name={ev.name} args={ev.args} />
                {ev.result && (
                  <div className="space-y-1">
                    <div className="text-[9px] text-muted-foreground/30 font-medium tracking-wide">
                      结果
                    </div>
                    {ev.name === "searchVideos" ? (
                      <SearchResultCards result={ev.result} onImport={onImport} />
                    ) : (
                      <pre className="text-[10px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto m-0 bg-muted/20 rounded-md p-2 select-text">
                        {ev.result.length > 500 ? ev.result.slice(0, 500) + "..." : ev.result}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
