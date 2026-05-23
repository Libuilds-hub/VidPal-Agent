"use client"

import { useState } from "react"
import { ChevronDown, Wrench, Loader2, CheckCircle2 } from "lucide-react"

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

function ToolResultView({ name, result }: { name: string; result: string }) {
  if (name === "searchVideos") {
    try {
      const data = JSON.parse(result)
      if (data.results && Array.isArray(data.results)) {
        return (
          <div className="space-y-1.5">
            {data.results.slice(0, 5).map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                <span className="truncate">{v.title}</span>
                <span className="text-[10px] px-1 py-px rounded bg-muted/50 border border-border/30 shrink-0">
                  {v.source === "bilibili" ? "B站" : "YT"}
                </span>
              </div>
            ))}
            {data.results.length > 5 && (
              <div className="text-[10px] text-muted-foreground/40 pl-4">
                ...还有 {data.results.length - 5} 个结果
              </div>
            )}
          </div>
        )
      }
    } catch {}
  }

  // Default: show truncated JSON
  const text = typeof result === "string" ? result : JSON.stringify(result, null, 2)
  return (
    <pre className="text-[10px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
      {text.length > 500 ? text.slice(0, 500) + "..." : text}
    </pre>
  )
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
    <div className="space-y-1.5">
      {events.map((ev) => {
        const isCollapsed = collapsed.has(ev.id)
        return (
          <div
            key={ev.id}
            className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden text-[12px]"
          >
            <button
              onClick={() => toggle(ev.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors"
            >
              {ev.status === "running" ? (
                <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              )}
              <Wrench className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="font-medium text-foreground/80">{ev.name}</span>
              <ChevronDown
                className={`h-3 w-3 ml-auto text-muted-foreground/40 transition-transform ${
                  isCollapsed ? "" : "rotate-180"
                }`}
              />
            </button>
            {!isCollapsed && (
              <div className="px-3 pb-2.5 space-y-1.5 border-t border-border/20 pt-2">
                <div className="text-[10px] text-muted-foreground/50">
                  参数: {JSON.stringify(ev.args)}
                </div>
                {ev.result && (
                  <div>
                    <div className="text-[10px] text-muted-foreground/50 mb-1">结果:</div>
                    <ToolResultView name={ev.name} result={ev.result} />
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
