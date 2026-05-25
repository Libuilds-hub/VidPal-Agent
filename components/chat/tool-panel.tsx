"use client"

import { useState } from "react"
import { ChevronDown, Wrench, Search, Eye, Download, FileSearch, Check, Play } from "lucide-react"
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
  onImportVideos?: (urls: string[]) => void
}

const TOOL_META: Record<string, { icon: typeof Search; label: string; color: string }> = {
  searchVideos: { icon: Search, label: "搜索视频", color: "text-sky-500" },
  searchTranscripts: { icon: FileSearch, label: "语义检索", color: "text-violet-500" },
  getVideoContext: { icon: Eye, label: "查看摘要", color: "text-emerald-500" },
  importVideo: { icon: Download, label: "导入视频", color: "text-orange-500" },
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return ""
  if (seconds < 60) return `${seconds}秒`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`
  return `${m}:${(seconds % 60).toString().padStart(2, "0")}`
}

function formatPlayCount(n: number | null): string {
  if (n == null) return ""
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万播放`
  return `${n}播放`
}

function formatArgValue(v: unknown): string {
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)
  if (Array.isArray(v)) return v.map(String).join("、")
  return JSON.stringify(v)
}

function ToolArgsBadges({ args }: { name: string; args: Record<string, unknown> }) {
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

interface VideoResult {
  id: string
  title: string
  url: string
  duration: number | null
  thumbnail: string | null
  uploader: string | null
  playCount: number | null
  source: "bilibili" | "youtube"
}

function SearchResultCards({ result, onImport }: { result: string; onImport?: (urls: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  try {
    const data = JSON.parse(result)
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      return (
        <div className="text-[11px] text-muted-foreground/40 py-2 text-center">
          未找到相关视频，建议换个关键词重试
        </div>
      )
    }

    const videos = data.results as VideoResult[]

    const toggle = (url: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(url)) next.delete(url)
        else next.add(url)
        return next
      })
    }

    const toggleAll = () => {
      if (selected.size === videos.length) {
        setSelected(new Set())
      } else {
        setSelected(new Set(videos.map((v) => v.url)))
      }
    }

    const handleImport = () => {
      const urls = videos.filter((v) => selected.has(v.url)).map((v) => v.url)
      if (urls.length > 0) onImport?.(urls)
    }

    return (
      <div className="space-y-0">
        {/* Select all toggle */}
        {videos.length > 1 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-1.5 py-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors w-full"
          >
            <span className={cn(
              "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
              selected.size === videos.length
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border/50"
            )}>
              {selected.size === videos.length && <Check className="h-2 w-2" />}
            </span>
            全选
          </button>
        )}

        {/* Video cards */}
        <div className="space-y-1.5">
          {videos.map((v, i) => {
            const isChecked = selected.has(v.url)
            return (
              <label
                key={i}
                className={cn(
                  "flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all",
                  isChecked
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border/30 bg-card/40 hover:border-border/50 hover:bg-muted/20"
                )}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(v.url)}
                  className="sr-only"
                />
                <span className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  isChecked
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border/50"
                )}>
                  {isChecked && <Check className="h-2.5 w-2.5" />}
                </span>

                {/* Thumbnail */}
                <span className="relative w-16 h-10 rounded bg-muted/60 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
                  <Play className="h-3 w-3 text-muted-foreground/25" />
                  {(v.thumbnail as string) && (
                    <img
                      src={v.thumbnail as string}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  )}
                </span>

                {/* Info */}
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] text-foreground/80 leading-[1.4] line-clamp-2 mb-0.5">
                    {v.title}
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    {v.duration != null && (
                      <span className="text-[10px] text-muted-foreground/45 font-mono">
                        {formatDuration(v.duration)}
                      </span>
                    )}
                    {v.uploader && (
                      <span className="text-[10px] text-muted-foreground/40 truncate max-w-[100px]">
                        {v.uploader}
                      </span>
                    )}
                    {v.playCount != null && (
                      <span className="text-[10px] text-muted-foreground/35">
                        {formatPlayCount(v.playCount)}
                      </span>
                    )}
                    <span className={cn(
                      "text-[9px] px-1.5 py-px rounded font-medium",
                      v.source === "bilibili"
                        ? "bg-pink-500/10 text-pink-500/60"
                        : "bg-red-500/10 text-red-500/60"
                    )}>
                      {v.source === "bilibili" ? "B站" : "YT"}
                    </span>
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        {/* Import button */}
        {onImport && (
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all mt-1",
              selected.size > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                : "bg-muted/40 text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <Download className="h-3 w-3" />
            分析选中的视频
            {selected.size > 0 && (
              <span className="text-[10px] opacity-70">({selected.size})</span>
            )}
          </button>
        )}
      </div>
    )
  } catch {
    return (
      <pre className="text-[10px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto m-0 bg-muted/20 rounded-md p-2 select-text">
        {result.length > 300 ? result.slice(0, 300) + "..." : result}
      </pre>
    )
  }
}

export function ToolPanel({ events, onImportVideos }: ToolPanelProps) {
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

            {!isCollapsed && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/10">
                <ToolArgsBadges name={ev.name} args={ev.args} />

                {ev.result && (
                  <div className="space-y-1">
                    {ev.name === "searchVideos" ? (
                      <SearchResultCards result={ev.result} onImport={onImportVideos} />
                    ) : (
                      <>
                        <div className="text-[9px] text-muted-foreground/30 font-medium tracking-wide">结果</div>
                        <pre className="text-[10px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto m-0 bg-muted/20 rounded-md p-2 select-text">
                          {ev.result.length > 500 ? ev.result.slice(0, 500) + "..." : ev.result}
                        </pre>
                      </>
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
