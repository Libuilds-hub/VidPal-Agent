"use client"

import { cn } from "@/lib/utils"
import { CheckIcon, ClockIcon, StarIcon } from "lucide-react"
import { useState } from "react"

export type VideoRecommendation = {
  id: string
  title: string
  source: "bilibili" | "youtube"
  duration: string
  thumbnail?: string
  quality: number // 0-100
  selected?: boolean
}

export function VideoRecommendationCard({
  video,
  onToggle,
  variant = "selectable",
}: {
  video: VideoRecommendation
  onToggle?: (id: string) => void
  variant?: "selectable" | "display"
}) {
  const [selected, setSelected] = useState(video.selected ?? false)

  const handleClick = () => {
    if (variant === "selectable") {
      const next = !selected
      setSelected(next)
      onToggle?.(video.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex gap-3 rounded border border-border/40 bg-card/45 p-2.5 transition-all duration-150 select-none",
        variant === "selectable" && "cursor-pointer hover:border-primary/50 hover:bg-card/75",
        selected && "border-primary/70 bg-primary/5 ring-[0.5px] ring-primary/45"
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-muted/65 border border-border/30">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/30">
            <div className="h-6 w-8 rounded bg-muted-foreground/15" />
          </div>
        )}
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 py-[1px] text-[8px] font-mono text-white/95">
          {video.duration}
        </span>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <p className="truncate text-xs font-medium leading-tight text-foreground/85 group-hover:text-primary transition-colors">
          {video.title}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/75 font-mono">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[8px] font-bold border uppercase tracking-wider",
              video.source === "bilibili"
                ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800"
            )}
          >
            {video.source === "bilibili" ? "BiliBili" : "YouTube"}
          </span>
          <span className="flex items-center gap-0.5">
            <StarIcon className="size-2.5 fill-amber-400 text-amber-400/90" />
            {video.quality}% 匹配度
          </span>
        </div>
      </div>

      {/* Select indicator */}
      {variant === "selectable" && (
        <div
          className={cn(
            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all self-center",
            selected
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border/60 group-hover:border-primary/40 bg-background/50"
          )}
        >
          {selected && <CheckIcon className="size-3 stroke-[3.5]" />}
        </div>
      )}
    </div>
  )
}

