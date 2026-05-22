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
        "group relative flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3 transition-all duration-200",
        variant === "selectable" && "cursor-pointer hover:border-primary/40 hover:bg-card",
        selected && "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-8 w-10 rounded bg-muted-foreground/20" />
          </div>
        )}
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {video.duration}
        </span>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <p className="truncate text-[13px] font-medium leading-snug text-foreground">
          {video.title}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              video.source === "bilibili"
                ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {video.source === "bilibili" ? "B站" : "YouTube"}
          </span>
          <span className="flex items-center gap-0.5">
            <StarIcon className="size-2.5 fill-amber-400 text-amber-400" />
            {video.quality}%
          </span>
          <span className="flex items-center gap-0.5">
            <ClockIcon className="size-2.5" />
            {video.duration}
          </span>
        </div>
      </div>

      {/* Select indicator */}
      {variant === "selectable" && (
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 group-hover:border-primary/50"
          )}
        >
          {selected && <CheckIcon className="size-3 stroke-[3]" />}
        </div>
      )}
    </div>
  )
}
