"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  ImageIcon,
  PlayIcon,
  ClockIcon,
  CheckCircle2Icon,
  PlusIcon,
  MoreHorizontalIcon,
  ExternalLinkIcon,
  SearchIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const collections = [
  {
    id: "c1",
    name: "Claude Code 学习路径",
    videoCount: 4,
    completedCount: 2,
    tags: ["实战", "MCP"],
    cover: null as string | null,
    description: "从零开始掌握 Claude Code CLI 工具的使用，涵盖 MCP 协议集成、自动化工作流构建等实战内容。",
  },
  {
    id: "c2",
    name: "RAG 技术专题",
    videoCount: 3,
    completedCount: 1,
    tags: ["RAG", "向量数据库"],
    cover: null as string | null,
    description: "深入理解检索增强生成（RAG）技术原理，结合向量数据库构建高效的知识检索系统。",
  },
]

const sampleVideos = [
  { id: "v1", title: "Claude Code 入门：安装与配置", source: "youtube", duration: 1240, status: "done", createdAt: "2026-05-15" },
  { id: "v2", title: "MCP 协议详解：Tool 与 Resource", source: "bilibili", duration: 2180, status: "done", createdAt: "2026-05-16" },
  { id: "v3", title: "构建你的第一个 MCP Server", source: "youtube", duration: 3150, status: "transcribing", createdAt: "2026-05-18" },
  { id: "v4", title: "Claude Code 自动化工作流实战", source: "bilibili", duration: 0, status: "pending", createdAt: "2026-05-20" },
]

const sourceLabel = (source: string) => {
  switch (source) {
    case "bilibili": return "BiliBili"
    case "youtube": return "YouTube"
    case "local": return "Local"
    default: return source
  }
}

const sourceBadge = (source: string) => {
  const base = "rounded-md px-1.5 py-0.5 text-[9px] font-mono border uppercase tracking-wider font-bold select-none"
  return cn(base, "bg-zinc-100 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800")
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "待处理", className: "text-zinc-500 bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800/40" },
  downloading: { label: "下载中", className: "text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50" },
  transcribing: { label: "转录中", className: "text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50" },
  done: { label: "已就绪", className: "text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50" },
  error: { label: "失败", className: "text-zinc-500 bg-zinc-500/5 border-zinc-200/20 dark:border-zinc-800/20" },
}

function formatDuration(seconds: number) {
  if (!seconds) return "--:--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("zh-CN")
}

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const collection = collections.find((c) => c.id === id)

  const [search, setSearch] = useState("")

  if (!collection) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">合集未找到</p>
          <Link href="/collections" className="text-xs font-semibold text-foreground/80 hover:text-foreground underline underline-offset-2">
            返回合集列表
          </Link>
        </div>
      </div>
    )
  }

  const progress = Math.round((collection.completedCount / Math.max(collection.videoCount, 1)) * 100)
  const filteredVideos = sampleVideos.filter((v) =>
    !search.trim() || v.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background">
      <div className="flex flex-col gap-6 px-6 py-6 max-w-5xl w-full mx-auto">

        {/* Header bar */}
        <div className="flex items-center justify-between select-none animate-in fade-in duration-200">
          <button
            onClick={() => router.push("/collections")}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="size-3.5" />
            返回合集
          </button>
          <div className="flex items-center gap-1.5">
            <button
              className="flex items-center gap-1.5 h-7.5 px-3 text-xs font-semibold border border-zinc-200/60 dark:border-zinc-800/50 text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 rounded-lg transition-all cursor-pointer"
            >
              <PencilIcon className="size-3.5" />
              编辑
            </button>
            <button
              onClick={() => {
                if (confirm("确定要删除这个合集吗？")) router.push("/collections")
              }}
              className="flex items-center gap-1.5 h-7.5 px-3 text-xs font-semibold border border-zinc-200/60 dark:border-zinc-800/50 text-rose-600/70 dark:text-rose-400/70 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
            >
              <Trash2Icon className="size-3.5" />
              删除
            </button>
          </div>
        </div>

        {/* Cover & Info section */}
        <div className="flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Cover */}
          <div className="relative aspect-video md:w-80 md:aspect-auto shrink-0 rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-100 dark:bg-zinc-850 shadow-xs">
            {collection.cover ? (
              <img src={collection.cover} alt={collection.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="size-8 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-between gap-4 min-w-0 flex-1">
            <div className="space-y-3">
              <h1 className="text-lg font-bold text-foreground/90 tracking-tight leading-snug">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-lg">
                  {collection.description}
                </p>
              )}
              {collection.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {collection.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[9px] font-mono border border-zinc-200/60 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 text-muted-foreground/60 uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Progress stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/55">
                <span>学习进度</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/80">
                <div
                  className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <PlayIcon className="size-3" />
                  {collection.videoCount} 个视频
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2Icon className="size-3" />
                  {collection.completedCount} 已完成
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3" />
                  {collection.videoCount - collection.completedCount} 未完成
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video list section */}
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/50 dark:border-zinc-800/40">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest font-mono select-none">
                视频列表
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground/40">
                {filteredVideos.length} 个视频
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索视频..."
                  className="h-8 w-44 rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-background/50 pl-8 pr-3 text-xs outline-none transition-all duration-150 focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/45 font-medium"
                />
              </div>
              <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-all cursor-pointer active:scale-97">
                <PlusIcon className="size-3.5" />
                添加视频
              </button>
            </div>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card/85 text-muted-foreground/50 shadow-xs">
                <PlayIcon className="size-4.5" />
              </div>
              <p className="text-xs font-semibold text-foreground/70">暂无视频</p>
              <p className="mt-1 text-[11px] text-muted-foreground/55">添加视频到这个合集中</p>
            </div>
          ) : (
            <div className="border border-zinc-200/50 dark:border-zinc-800/40 bg-card/35 rounded-xl overflow-hidden divide-y divide-zinc-200/30 dark:divide-zinc-800/20 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
              {filteredVideos.map((video) => {
                const status = statusConfig[video.status] || statusConfig.pending
                return (
                  <div
                    key={video.id}
                    className="group flex items-center gap-5 px-5 py-3.5 transition-colors duration-150 hover:bg-muted/15 cursor-pointer select-none"
                  >
                    {/* Thumbnail placeholder */}
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/40 dark:border-zinc-800/45 flex items-center justify-center">
                      <PlayIcon className="size-3.5 text-muted-foreground/25" />
                    </div>

                    {/* Title */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-foreground/80 group-hover:text-foreground transition-colors leading-snug tracking-tight">
                        {video.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={sourceBadge(video.source)}>{sourceLabel(video.source)}</span>
                        <span className="text-[10px] text-muted-foreground/40 font-mono">{formatDate(video.createdAt)}</span>
                      </div>
                    </div>

                    {/* Duration */}
                    <span className="text-[10px] font-mono text-muted-foreground/45 w-12 text-right shrink-0">
                      {formatDuration(video.duration)}
                    </span>

                    {/* Status */}
                    <div className="w-20 shrink-0 flex justify-end">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold border",
                        status.className
                      )}>
                        {status.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="w-8 shrink-0 flex justify-end">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground/50 hover:text-foreground transition-all cursor-pointer"
                      >
                        <MoreHorizontalIcon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
