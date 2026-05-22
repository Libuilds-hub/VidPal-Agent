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
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
  SendIcon,
  UploadIcon,
  FileVideoIcon,
  Link2Icon,
  HelpCircleIcon,
  XIcon,
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

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: {
    label: "待处理",
    icon: ClockIcon,
    className: "text-muted-foreground/80 bg-muted/10 border-border/40",
  },
  downloading: {
    label: "下载中",
    icon: Loader2Icon,
    className: "text-amber-500 bg-amber-500/5 border-amber-500/10",
  },
  transcribing: {
    label: "转录中",
    icon: Loader2Icon,
    className: "text-blue-500 bg-blue-500/5 border-blue-500/10",
  },
  done: {
    label: "已完成",
    icon: CheckCircle2Icon,
    className: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10",
  },
  error: {
    label: "失败",
    icon: AlertCircleIcon,
    className: "text-rose-500 bg-rose-500/5 border-rose-500/10",
  },
}

const sourceBadge = (source: string) => {
  const base = "rounded px-1.5 py-0.5 text-[9px] font-mono border uppercase tracking-wider font-semibold"
  switch (source) {
    case "bilibili":
      return cn(base, "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800")
    case "youtube":
      return cn(base, "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800")
    case "local":
      return cn(base, "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800")
    default:
      return cn(base, "bg-muted text-muted-foreground border-border/40")
  }
}

const sourceLabel = (source: string) => {
  switch (source) {
    case "bilibili": return "BiliBili"
    case "youtube": return "YouTube"
    case "local": return "Local"
    default: return source
  }
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const router = useRouter()

  // Import modal states
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<"link" | "file">("link")

  useEffect(() => {
    fetchVideos()

    // Detect import query parameter from direct navigations
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("import") === "true") {
        setIsImportOpen(true)
        const newUrl = window.location.pathname
        window.history.replaceState({ path: newUrl }, "", newUrl)
      }
    }

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

  const handleImportSend = async () => {
    if (!inputValue.trim()) return

    setIsImporting(true)
    setImportMessage(null)

    try {
      const res = await fetch("/api/video/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputValue.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "解析视频失败")
      }

      setImportMessage({ type: "success", text: "视频分析任务创建成功！" })
      setInputValue("")
      
      // Refresh the video list instantly
      fetchVideos()

      // Close the modal after 1.5 seconds
      setTimeout(() => {
        setIsImportOpen(false)
        setImportMessage(null)
      }, 1500)
    } catch (error) {
      setImportMessage({ type: "error", text: error instanceof Error ? error.message : "解析视频失败" })
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsImporting(true)
    setImportMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/video/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "上传视频失败")
      }

      setImportMessage({ type: "success", text: "视频文件上传成功！" })
      setFileName(null)

      // Refresh the video list instantly
      fetchVideos()

      // Close the modal after 1.5 seconds
      setTimeout(() => {
        setIsImportOpen(false)
        setImportMessage(null)
      }, 1500)
    } catch (error) {
      setImportMessage({ type: "error", text: error instanceof Error ? error.message : "上传视频失败" })
      setFileName(null)
    } finally {
      setIsImporting(false)
    }
  }

  const detectPlatform = (url: string) => {
    if (!url) return null
    if (url.includes("bilibili.com") || url.includes("b23.tv")) return "BiliBili"
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube"
    return "Auto Detect"
  }

  const platform = detectPlatform(inputValue)

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
    <div className="flex flex-1 flex-col overflow-y-auto bg-background">
      <div className="flex flex-col gap-5 px-6 py-6 max-w-6xl w-full mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between select-none">
          <div className="space-y-0.5">
            <h1 className="text-[18px] font-semibold tracking-tight text-foreground/90">视频资源库</h1>
            <p className="text-xs text-muted-foreground/80">
              管理已导入的音视频资源，查阅解析状态与智能摘要
            </p>
          </div>
          <Button onClick={() => setIsImportOpen(true)} size="sm" className="gap-1.5 h-7.5 px-3 text-xs bg-foreground text-background hover:bg-foreground/90 rounded border-none shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <PlusIcon className="size-3.5" />
            导入视频
          </Button>
        </div>

        {/* Search bar & Filter summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/30">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题或平台来源..."
              className="h-7.5 w-full rounded border border-border/45 bg-muted/20 pl-8 pr-3 text-xs outline-none transition-all duration-150 focus:border-primary/50 focus:bg-background focus:ring-1 focus:ring-primary/10 placeholder:text-muted-foreground/45"
            />
          </div>

          <div className="flex items-center text-[11px] text-muted-foreground/75 font-mono select-none">
            <span>共 {filteredVideos.length} 个视频</span>
            {search && <span className="ml-1 text-primary">· 已过滤 "{search}"</span>}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-28 select-none">
            <div className="flex flex-col items-center gap-3 text-muted-foreground/80">
              <Loader2Icon className="size-5 animate-spin text-primary" />
              <p className="text-xs font-mono">数据加载中...</p>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 bg-card/10 select-none">
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-border/40 bg-card/85 text-muted-foreground/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <VideoIcon className="size-5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground/80">
                {search ? "无符合过滤条件的视频" : "视频库为空"}
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/70 leading-normal">
                {search
                  ? "请尝试精简或更换您的搜索关键词"
                  : "从外部平台粘贴链接或上传本地视频，即刻让 AI 建立深度知识网络"}
              </p>
              {!search && (
                <div className="mt-5 flex gap-2.5">
                  <Link href="/ai-assistant">
                    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-border/50 text-foreground/80 hover:bg-muted/30">
                      <SearchIcon className="size-3.5" />
                      AI 对话查找
                    </Button>
                  </Link>
                  <Button onClick={() => setIsImportOpen(true)} size="sm" className="gap-1.5 h-7 text-xs bg-foreground text-background hover:bg-foreground/90">
                    <PlusIcon className="size-3.5" />
                    手动导入
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-border/45 bg-card/35 rounded-lg overflow-hidden divide-y divide-border/35 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            
            {/* Table Header Row */}
            <div className="hidden sm:flex items-center gap-4 bg-muted/20 px-3.5 py-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
              <div className="w-14 shrink-0">封面</div>
              <div className="flex-1">视频标题</div>
              <div className="w-24 shrink-0">平台来源</div>
              <div className="w-24 shrink-0">导入日期</div>
              <div className="w-28 shrink-0">解析状态</div>
              <div className="w-10 shrink-0 text-right">操作</div>
            </div>

            {/* List Rows */}
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
                    "group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-3.5 py-2.5 text-xs transition-colors duration-150",
                    isDone ? "cursor-pointer hover:bg-muted/25" : "bg-muted/5",
                    !isDone && !isProcessing && "opacity-60",
                    isProcessing && "opacity-85"
                  )}
                >
                  {/* Thumbnail Column */}
                  <div className="relative h-9 w-16 shrink-0 overflow-hidden rounded bg-muted/65 border border-border/30 flex items-center justify-center">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title || "视频封面"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <VideoIcon className="size-4 text-muted-foreground/35" />
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                        <Loader2Icon className="size-3.5 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* Title Column */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[12px] font-medium text-foreground/85 group-hover:text-primary transition-colors leading-tight">
                        {video.title || "未命名视频或解析中"}
                      </p>
                      {isDone && (
                        <ExternalLinkIcon className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>

                  {/* Platform Column */}
                  <div className="w-24 shrink-0 sm:block flex items-center gap-2">
                    <span className="sm:hidden text-[10px] text-muted-foreground/50">平台：</span>
                    <span className={sourceBadge(video.source)}>
                      {sourceLabel(video.source)}
                    </span>
                  </div>

                  {/* Date Column */}
                  <div className="w-24 shrink-0 sm:block flex items-center gap-2 text-muted-foreground/75 font-mono text-[11px]">
                    <span className="sm:hidden text-[10px] text-muted-foreground/50">时间：</span>
                    <span>{formatDate(video.createdAt)}</span>
                  </div>

                  {/* Status Column */}
                  <div className="w-28 shrink-0 sm:block flex items-center gap-2 select-none">
                    <span className="sm:hidden text-[10px] text-muted-foreground/50">状态：</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium border",
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

                  {/* Actions Column */}
                  <div className="w-10 shrink-0 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDelete(e, video.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:bg-rose-950/20 transition-all"
                      title="删除视频"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Import Video Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 animate-in fade-in duration-250 select-none">
          <div 
            className="relative w-full max-w-md rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-background dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-muted/10 px-5.5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/75 animate-pulse" />
                <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">导入视频资源</span>
              </div>
              <button 
                onClick={() => {
                  setIsImportOpen(false)
                  setImportMessage(null)
                  setInputValue("")
                  setFileName(null)
                }}
                className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground transition-all duration-150"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-5.5 space-y-4">
              
              {/* Segmented Control Tabs */}
              <div className="flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/10">
                <button
                  onClick={() => {
                    setActiveTab("link")
                    setImportMessage(null)
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer",
                    activeTab === "link"
                      ? "bg-white dark:bg-zinc-950 text-foreground shadow-xs border border-zinc-200/40 dark:border-zinc-800/30"
                      : "text-muted-foreground/80 hover:text-foreground"
                  )}
                  disabled={isImporting}
                >
                  <Link2Icon className="size-3.5" />
                  <span>网络视频链接</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("file")
                    setImportMessage(null)
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer",
                    activeTab === "file"
                      ? "bg-white dark:bg-zinc-950 text-foreground shadow-xs border border-zinc-200/40 dark:border-zinc-800/30"
                      : "text-muted-foreground/80 hover:text-foreground"
                  )}
                  disabled={isImporting}
                >
                  <UploadIcon className="size-3.5" />
                  <span>上传本地文件</span>
                </button>
              </div>

              {/* Status Alert Message */}
              {importMessage && (
                <div
                  className={cn(
                    "flex items-start gap-2.5 px-3.5 py-3 rounded-lg border text-xs leading-normal font-medium animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xs",
                    importMessage.type === "success"
                      ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-500"
                      : "border-rose-500/15 bg-rose-500/5 text-rose-500"
                  )}
                >
                  {importMessage.type === "success" ? (
                    <CheckCircle2Icon className="size-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block font-semibold">{importMessage.type === "success" ? "操作成功" : "导入失败"}</span>
                    <span className="block text-[11px] text-muted-foreground/80 mt-0.5 leading-relaxed">{importMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Tab Content 1: URL Link */}
              {activeTab === "link" && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                      视频链接地址
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="粘贴 B站 或 YouTube 视频网页链接..."
                        className="h-10 w-full rounded-lg border border-border/45 bg-muted/10 px-3 pl-9.5 text-xs outline-none transition-all focus:border-primary/80 focus:bg-background focus:ring-1 focus:ring-primary/10 placeholder:text-muted-foreground/45"
                        disabled={isImporting}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleImportSend()
                          }
                        }}
                      />
                      <Link2Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
                    </div>
                  </div>

                  {/* Brand detection capsules */}
                  {platform && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80 animate-in slide-in-from-left-2 duration-200">
                      <span>识别到目标平台:</span>
                      <span className={cn(
                        "rounded-md px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] border",
                        platform === "BiliBili"
                          ? "bg-pink-500/10 text-pink-500 dark:bg-pink-500/15 border-pink-500/20"
                          : platform === "YouTube"
                            ? "bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 border-rose-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                      )}>
                        {platform}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 2: Upload File Area */}
              {activeTab === "file" && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {fileName ? (
                    /* Elegant file uploading status block */
                    <div className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-muted/5 text-xs font-medium shadow-xs">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900/5 dark:bg-zinc-100/5 text-muted-foreground/80 border border-border/40">
                        <FileVideoIcon className="size-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground/85 font-semibold text-[11.5px] leading-tight">{fileName}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 leading-tight">
                          {isImporting ? "文件正在安全上传至服务器..." : "准备解析中..."}
                        </p>
                      </div>
                      {isImporting && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <Loader2Icon className="size-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Premium drag and drop trigger zone */
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                        本地视频文件
                      </label>
                      <label
                        htmlFor="video-upload-area"
                        className={cn(
                          "flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl py-9 px-4 bg-muted/5 hover:bg-muted/15 hover:border-primary/40 dark:hover:border-primary/30 transition-all duration-200 cursor-pointer group text-center min-h-[160px]",
                          isImporting && "opacity-60 pointer-events-none"
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/30 dark:border-zinc-700/20 text-muted-foreground group-hover:text-primary group-hover:scale-105 group-hover:border-primary/20 transition-all duration-250 mb-3.5 shadow-sm">
                          <FileVideoIcon className="size-5 transition-colors" />
                        </div>
                        <span className="text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                          拖拽视频文件到此处，或点击浏览
                        </span>
                        <span className="mt-1.5 text-[10px] text-muted-foreground/50 leading-normal font-mono">
                          支持 MP4, MOV, MKV · 最大 500MB
                        </span>
                        <input
                          id="video-upload-area"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleImportFileChange}
                          disabled={isImporting}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Tip Footer text */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-medium select-none pt-1">
                <HelpCircleIcon className="size-3" />
                <span>视频提取会自动切分音轨并基于大模型生成知识图谱</span>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="bg-muted/10 px-6 py-4 border-t border-border/30 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsImportOpen(false)
                  setImportMessage(null)
                  setInputValue("")
                  setFileName(null)
                }}
                disabled={isImporting}
                className="h-8.5 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all duration-150 cursor-pointer"
              >
                取消
              </Button>
              {activeTab === "link" && (
                <Button
                  onClick={handleImportSend}
                  disabled={isImporting || !inputValue.trim()}
                  className="h-8.5 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 active:scale-98 rounded-lg border-none shadow-[0_1px_2px_rgba(0,0,0,0.05)] gap-1.5 transition-all duration-150 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      <span>正在分析...</span>
                    </>
                  ) : (
                    <span>创建</span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
