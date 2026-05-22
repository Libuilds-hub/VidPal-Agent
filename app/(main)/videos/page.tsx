"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  VideoIcon,
  SearchIcon,
  TrashIcon,
  PlusIcon,
  ExternalLinkIcon,
  Loader2Icon,
  DownloadIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Video {
  id: string
  title: string | null
  source: string
  url: string | null
  localPath: string | null
  thumbnail: string | null
  status: string
  createdAt: string
}

const statusConfig: Record<string, { label: string; icon: typeof Loader2Icon; className: string }> = {
  pending: {
    label: "待处理",
    icon: Loader2Icon,
    className: "text-muted-foreground bg-muted",
  },
  downloading: {
    label: "下载中",
    icon: DownloadIcon,
    className: "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
  },
  transcribing: {
    label: "转录中",
    icon: FileTextIcon,
    className: "text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  },
  done: {
    label: "已完成",
    icon: CheckCircleIcon,
    className: "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30",
  },
  error: {
    label: "错误",
    icon: AlertCircleIcon,
    className: "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
  },
}

const sourceBadge = (source: string) => {
  const base = "rounded px-1.5 py-0.5 text-[10px] font-medium"
  switch (source) {
    case "bilibili":
      return cn(base, "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400")
    case "youtube":
      return cn(base, "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")
    case "local":
      return cn(base, "bg-muted text-muted-foreground")
    default:
      return cn(base, "bg-muted text-muted-foreground")
  }
}

const sourceLabel = (source: string) => {
  switch (source) {
    case "bilibili": return "B站"
    case "youtube": return "YouTube"
    case "local": return "本地"
    default: return source
  }
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchVideos()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchVideos()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    const interval = setInterval(fetchVideos, 10000)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(interval)
    }
  }, [])

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/video")
      const data = await res.json()
      setVideos(Array.isArray(data) ? data : [])
    } catch {
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation()
    if (!confirm("确定要删除这个视频吗？")) return
    try {
      await fetch(`/api/video/${videoId}`, { method: "DELETE" })
      setVideos(videos.filter((v) => v.id !== videoId))
    } catch {
      console.error("Failed to delete video")
    }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("zh-CN")

  const filteredVideos = videos
    .filter((v) => v.title)
    .filter((v) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        v.title?.toLowerCase().includes(q) ||
        sourceLabel(v.source).toLowerCase().includes(q)
      )
    })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">视频库</h1>
            <p className="text-sm text-muted-foreground">
              管理所有已分析视频，支持全局内容搜索
            </p>
          </div>
          <Link href="/videos/new">
            <Button size="sm" className="gap-1.5 h-9">
              <PlusIcon className="size-4" />
              添加视频
            </Button>
          </Link>
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索视频标题或来源..."
            className="h-9 w-full rounded-lg border border-border/60 bg-muted/50 pl-9 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary/50" />
              <p className="text-sm">加载中...</p>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <VideoIcon className="size-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {search ? "没有找到匹配的视频" : "还没有视频"}
                </p>
                <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
                  {search
                    ? "试试其他关键词，或清空搜索条件"
                    : "通过 AI 助手搜索或手动添加视频链接，开始构建你的视频知识库"}
                </p>
                {!search && (
                  <div className="mt-4 flex gap-2">
                    <Link href="/ai-assistant">
                      <Button variant="outline" size="sm" className="gap-1.5 h-9">
                        <SearchIcon className="size-4" />
                        AI 助手搜索
                      </Button>
                    </Link>
                    <Link href="/videos/new">
                      <Button size="sm" className="gap-1.5 h-9">
                        <PlusIcon className="size-4" />
                        手动添加
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Count */}
            <p className="px-1 text-[11px] font-medium text-muted-foreground/60">
              共 {filteredVideos.length} 个视频
              {search && ` · 搜索 "${search}"`}
            </p>

            {/* Video list */}
            {filteredVideos.map((video) => {
              const isDone = video.status === "done"
              const isProcessing = video.status === "downloading" || video.status === "transcribing"
              const status = statusConfig[video.status] || statusConfig.pending
              const StatusIcon = status.icon

              return (
                <div
                  key={video.id}
                  onClick={() => isDone && router.push(`/videos/${video.id}`)}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl border border-border/60 bg-card/80 p-3 transition-all duration-200",
                    isDone && "cursor-pointer hover:border-primary/40 hover:bg-card hover:shadow-sm",
                    !isDone && !isProcessing && "opacity-60",
                    isProcessing && "opacity-80"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title || "视频封面"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <VideoIcon className="size-6 text-muted-foreground/30" />
                      </div>
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Loader2Icon className="size-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {video.title || "无标题"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className={sourceBadge(video.source)}>
                          {sourceLabel(video.source)}
                        </span>
                        <span>{formatDate(video.createdAt)}</span>
                        {video.status === "done" && isDone && (
                          <ExternalLinkIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
                        status.className
                      )}
                    >
                      {StatusIcon && (
                        <StatusIcon
                          className={cn(
                            "size-3",
                            (video.status === "downloading" || video.status === "transcribing") && "animate-spin"
                          )}
                        />
                      )}
                      {status.label}
                    </span>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(e, video.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 group-hover:opacity-100"
                    title="删除"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
