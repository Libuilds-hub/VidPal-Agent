"use client"

import { useState } from "react"
import {
  ChevronDown, Wrench, Search, Eye, Download, FileSearch,
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
}

const TOOL_META: Record<string, { icon: typeof Search; label: string; color: string }> = {
  searchVideos: { icon: Search, label: "搜索视频", color: "text-sky-500" },
  searchTranscripts: { icon: FileSearch, label: "语义检索", color: "text-violet-500" },
  getVideoContext: { icon: Eye, label: "查看摘要", color: "text-emerald-500" },
  importVideo: { icon: Download, label: "导入视频", color: "text-orange-500" },
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

function SearchResultCards({ result }: { result: string }) {
  try {
    const data = JSON.parse(result)
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      return <div className="text-[10px] text-muted-foreground/40 py-1">未找到相关视频</div>
    }
    return (
      <div className="space-y-1">
        {data.results.slice(0, 5).map((v: Record<string, unknown>, i: number) => (
          <a
            key={i}
            href={(v.url as string) || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors group/link"
          >
            <span className="relative w-5 h-5 rounded bg-muted/60 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
              <Search className="h-2.5 w-2.5 text-muted-foreground/30" />
              {(v.thumbnail as string) && (
                <img
                  src={v.thumbnail as string}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              )}
            </span>
            <span className="flex-1 text-[11px] text-foreground/70 truncate group-hover/link:text-foreground/85 transition-colors">
              {v.title as string || "未知标题"}
            </span>
            <span
              className={cn(
                "text-[9px] px-1.5 py-px rounded font-medium shrink-0",
                v.source === "bilibili"
                  ? "bg-pink-500/10 text-pink-500/70"
                  : "bg-red-500/10 text-red-500/70"
              )}
            >
              {v.source === "bilibili" ? "B站" : "YouTube"}
            </span>
          </a>
        ))}
        {data.results.length > 5 && (
          <div className="text-[10px] text-muted-foreground/30 pl-7">
            还有 {data.results.length - 5} 个结果...
          </div>
        )}
      </div>
    )
  } catch {
    return (
      <pre className="text-[10px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto m-0 select-text">
        {result.length > 300 ? result.slice(0, 300) + "..." : result}
      </pre>
    )
  }
}

export function ToolPanel({ events }: ToolPanelProps) {
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
                      <SearchResultCards result={ev.result} />
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
