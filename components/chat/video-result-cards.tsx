"use client"

import { useState } from "react"
import { Play, Clock, User, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export interface VideoResult {
  id: string
  title: string
  url: string
  duration: number | null
  thumbnail: string | null
  uploader: string | null
  source: "bilibili" | "youtube"
}

interface VideoResultCardsProps {
  result: string
  onImport?: (urls: string[]) => void
  importing?: boolean
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return ""
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

export function getVideoResults(result: string): VideoResult[] {
  try {
    const data = JSON.parse(result)
    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      return data.results as VideoResult[]
    }
  } catch {}
  return []
}

export function VideoResultCards({ result, onImport, importing }: VideoResultCardsProps) {
  const videos = getVideoResults(result)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  if (videos.length === 0) return null

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set())
      setSelectAll(false)
    } else {
      setSelected(new Set(videos.map((v) => v.url)))
      setSelectAll(true)
    }
  }

  const handleImport = () => {
    const urls = [...selected]
    if (urls.length === 0) return
    onImport?.(urls)
  }

  return (
    <div className="space-y-3 my-2">
      {/* Cards */}
      <div className="grid gap-2">
        {videos.map((v) => {
          const isChecked = selected.has(v.url)
          return (
            <label
              key={v.id || v.url}
              className={cn(
                "flex gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-150",
                isChecked
                  ? "border-primary/30 bg-primary/[0.03] shadow-sm"
                  : "border-border/40 bg-card/60 hover:border-border/60 hover:bg-card"
              )}
              onClick={() => toggle(v.url)}
            >
              {/* Checkbox */}
              <div className="flex items-start pt-0.5 shrink-0">
                <div
                  className={cn(
                    "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                    isChecked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/25"
                  )}
                >
                  {isChecked && (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="text-[13px] font-medium text-foreground/85 leading-snug flex-1">
                    {v.title}
                  </p>
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-px rounded font-medium",
                      v.source === "bilibili"
                        ? "bg-pink-500/10 text-pink-500/70"
                        : "bg-red-500/10 text-red-500/70"
                    )}
                  >
                    {v.source === "bilibili" ? "B站" : "YouTube"}
                  </span>
                  {v.uploader && (
                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      {v.uploader}
                    </span>
                  )}
                  {v.duration != null && v.duration > 0 && (
                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(v.duration)}
                    </span>
                  )}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSelectAll}
          className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
        >
          {selectAll ? "取消全选" : "全选"}
        </button>
        <button
          onClick={handleImport}
          disabled={selected.size === 0 || importing}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200",
            selected.size > 0 && !importing
              ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm"
              : "bg-muted text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          {importing ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              开始分析 {selected.size > 0 && `(${selected.size})`}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
