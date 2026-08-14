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
  SlidersHorizontalIcon,
  LayoutGridIcon,
  ListIcon,
  ChevronDownIcon,
} from "lucide-react"
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
    className: "text-zinc-500 bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800/40",
  },
  downloading: {
    label: "下载中",
    icon: Loader2Icon,
    className: "text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50",
  },
  transcribing: {
    label: "转录中",
    icon: Loader2Icon,
    className: "text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50",
  },
  done: {
    label: "已就绪",
    icon: CheckCircle2Icon,
    className: "text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50",
  },
  error: {
    label: "处理失败",
    icon: AlertCircleIcon,
    className: "text-zinc-500 bg-zinc-500/5 border-zinc-200/20 dark:border-zinc-800/20",
  },
}

const sourceBadge = (source: string) => {
  const base = "rounded-md px-1.5 py-0.5 text-[9px] font-mono border uppercase tracking-wider font-bold select-none scale-95 origin-left"
  return cn(base, "bg-zinc-100 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800")
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

  // View state and dynamic filters
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterTimeframe, setFilterTimeframe] = useState<string>("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // Import modal states
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<"link" | "file">("link")

  useEffect(() => {
    // Hydrate view mode from localStorage safely
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("videos_view_mode") as "grid" | "list"
      if (saved === "grid" || saved === "list") {
        setViewMode(saved)
      }
    }

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

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode)
    if (typeof window !== "undefined") {
      localStorage.setItem("videos_view_mode", mode)
    }
  }

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

      // 异步触发转写与分析流程
      fetch("/api/video/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: data.id }),
      }).catch((err) => console.error("Trigger transcription error:", err))

      setImportMessage({ type: "success", text: "视频文件上传成功，正在后台解析中..." })
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
      // 1. Search filter
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        v.title?.toLowerCase().includes(q) ||
        sourceLabel(v.source).toLowerCase().includes(q)
      )
    })
    .filter((v) => {
      // 2. Platform filter
      if (filterPlatform === "all") return true
      return v.source.toLowerCase() === filterPlatform.toLowerCase()
    })
    .filter((v) => {
      // 3. Timeframe filter
      if (filterTimeframe === "all") return true

      const createdTime = new Date(v.createdAt).getTime()
      const now = new Date().getTime()

      if (filterTimeframe === "7days") {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
        return createdTime >= sevenDaysAgo
      }

      if (filterTimeframe === "30days") {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
        return createdTime >= thirtyDaysAgo
      }

      if (filterTimeframe === "custom") {
        let match = true
        if (customStartDate) {
          const start = new Date(customStartDate)
          start.setHours(0, 0, 0, 0)
          match = match && createdTime >= start.getTime()
        }
        if (customEndDate) {
          const end = new Date(customEndDate)
          end.setHours(23, 59, 59, 999)
          match = match && createdTime <= end.getTime()
        }
        return match
      }

      return true
    })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background">
      <div className="flex flex-col gap-5 px-6 py-6 max-w-6xl w-full mx-auto">
        
        {/* Sleek Action & Toolbar Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3 border-b border-zinc-200/50 dark:border-zinc-800/40 select-none animate-in fade-in duration-200">
          
          <div className="flex flex-1 items-center gap-2 max-w-xl">
            {/* Search Input Bar */}
            <div className="relative flex-1 max-w-xs">
              <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="在视频库中搜索..."
                className="h-8 w-full rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-background/50 pl-8 pr-3 text-xs outline-none transition-all duration-150 focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/45 font-medium"
              />
            </div>

            {/* Premium Floating Dropdown Filter Button Wrapper */}
            <div className="relative z-30">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer select-none active:scale-97",
                  isFilterOpen || filterPlatform !== "all" || filterTimeframe !== "all"
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100"
                    : "bg-background border-zinc-200/60 dark:border-zinc-800/50 text-muted-foreground/80 hover:text-foreground hover:bg-muted/40"
                )}
              >
                <SlidersHorizontalIcon className="size-3.5" />
                <span>筛选</span>
                <ChevronDownIcon className={cn("size-3.5 transition-transform duration-250", isFilterOpen && "rotate-180")} />
              </button>

              {/* Floating Popover Dropdown Panel */}
              {isFilterOpen && (
                <>
                  {/* Transparent overlay to close popover when clicking outside */}
                  <div 
                    className="fixed inset-0 z-30 cursor-default" 
                    onClick={() => setIsFilterOpen(false)}
                  />

                  {/* Absolute Dropdown Panel */}
                  <div className="absolute left-0 mt-1.5 z-40 w-80 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 bg-background/98 dark:bg-zinc-950/98 backdrop-blur-md p-4.5 shadow-xl select-none animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">
                    
                    {/* Platform Filter */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block font-mono">
                        平台来源
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {["all", "bilibili", "youtube", "local"].map((p) => {
                          const label = p === "all" ? "全部" : p === "bilibili" ? "BiliBili" : p === "youtube" ? "YouTube" : "本地视频"
                          const active = filterPlatform === p
                          return (
                            <button
                              key={p}
                              onClick={() => setFilterPlatform(p)}
                              className={cn(
                                "px-2.5 py-1 text-xs rounded-md border transition-all duration-200 cursor-pointer select-none",
                                active 
                                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs"
                                  : "bg-white/40 dark:bg-zinc-900/5 border-zinc-200/60 dark:border-zinc-800/40 text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-zinc-900/30"
                              )}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time timeframe filter */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block font-mono">
                        导入时间
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: "all", label: "全部时间" },
                          { key: "7days", label: "最近 7 天" },
                          { key: "30days", label: "最近 30 天" },
                          { key: "custom", label: "自定义日期" },
                        ].map((t) => {
                          const active = filterTimeframe === t.key
                          return (
                            <button
                              key={t.key}
                              onClick={() => setFilterTimeframe(t.key)}
                              className={cn(
                                "px-2.5 py-1 text-xs rounded-md border transition-all duration-200 cursor-pointer select-none",
                                active 
                                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs"
                                  : "bg-white/40 dark:bg-zinc-900/5 border-zinc-200/60 dark:border-zinc-800/40 text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-zinc-900/30"
                              )}
                            >
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Custom Date selections */}
                    <div className={cn(
                      "grid transition-all duration-250 ease-in-out overflow-hidden",
                      filterTimeframe === "custom" ? "grid-rows-[1fr] opacity-100 pt-3.5 border-t border-zinc-200/40 dark:border-zinc-800/20" : "grid-rows-[0fr] opacity-0"
                    )}>
                      <div className="overflow-hidden space-y-2.5">
                        <div className="flex flex-col gap-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-medium select-none">开始日期:</span>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="h-8 rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-background/50 px-2.5 text-xs outline-none transition-all focus:border-zinc-400 focus:bg-background font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-medium select-none">结束日期:</span>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="h-8 rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-background/50 px-2.5 text-xs outline-none transition-all focus:border-zinc-400 focus:bg-background font-mono"
                            />
                          </div>
                        </div>
                        {(customStartDate || customEndDate) && (
                          <button
                            onClick={() => {
                              setCustomStartDate("")
                              setCustomEndDate("")
                            }}
                            className="w-full h-7 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground/60 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors font-semibold flex items-center justify-center gap-1 cursor-pointer bg-white/40 dark:bg-zinc-900/10"
                          >
                            清空日期
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Panel Actions Footer */}
                    <div className="pt-3.5 border-t border-zinc-200/40 dark:border-zinc-800/20 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setFilterPlatform("all")
                          setFilterTimeframe("all")
                          setCustomStartDate("")
                          setCustomEndDate("")
                        }}
                        className="text-[10px] text-muted-foreground hover:text-zinc-950 dark:hover:text-zinc-100 font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        重置所有
                      </button>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="h-7 px-3 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-[10px] tracking-wider uppercase transition-colors cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      >
                        完成
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* Premium Upload Button - Relocated to the right of Filter */}
            <Button
              onClick={() => setIsImportOpen(true)}
              size="sm"
              className="gap-1.5 h-8 px-3 text-xs font-semibold bg-background border border-zinc-200/60 dark:border-zinc-800/50 text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 rounded-lg shadow-none active:scale-97 cursor-pointer shrink-0 transition-all duration-200"
            >
              <UploadIcon className="size-3.5" />
              上传
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented View Switcher */}
            <div className="flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200/30 dark:border-zinc-800/30 select-none items-center h-8">
              <button
                onClick={() => handleViewModeChange("grid")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all duration-200 cursor-pointer h-full",
                  viewMode === "grid"
                    ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs border border-zinc-200/35 dark:border-zinc-800/35"
                    : "text-muted-foreground/75 hover:text-foreground"
                )}
                title="网格视图"
              >
                <LayoutGridIcon className="size-3.5" />
                <span>网格</span>
              </button>
              <button
                onClick={() => handleViewModeChange("list")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all duration-200 cursor-pointer h-full",
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs border border-zinc-200/35 dark:border-zinc-800/35"
                    : "text-muted-foreground/75 hover:text-foreground"
                )}
                title="列表视图"
              >
                <ListIcon className="size-3.5" />
                <span>列表</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(filterPlatform !== "all" || filterTimeframe !== "all") && (
          <div className="flex flex-wrap items-center gap-2.5 py-1 select-none animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-[10px] text-muted-foreground/45 font-mono uppercase tracking-wider font-bold">已启用筛选:</span>
            
            {filterPlatform !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10.5px] font-semibold border border-zinc-200/60 dark:border-zinc-700">
                <span>平台: {filterPlatform === "bilibili" ? "BiliBili" : filterPlatform === "youtube" ? "YouTube" : "本地视频"}</span>
                <button
                  onClick={() => setFilterPlatform("all")}
                  className="hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            )}

            {filterTimeframe !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10.5px] font-semibold border border-zinc-200/60 dark:border-zinc-700">
                <span>
                  时间: {
                    filterTimeframe === "7days" ? "最近 7 天" : 
                    filterTimeframe === "30days" ? "最近 30 天" : 
                    `自定义日期 (${customStartDate || "未设"} ~ ${customEndDate || "未设"})`
                  }
                </span>
                <button
                  onClick={() => {
                    setFilterTimeframe("all")
                    setCustomStartDate("")
                    setCustomEndDate("")
                  }}
                  className="hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setFilterPlatform("all")
                setFilterTimeframe("all")
                setCustomStartDate("")
                setCustomEndDate("")
              }}
              className="text-xs text-muted-foreground hover:text-zinc-950 dark:hover:text-zinc-100 font-semibold transition-colors cursor-pointer ml-1 underline underline-offset-2"
            >
              全部清空
            </button>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-32 select-none">
            <div className="flex flex-col items-center gap-3.5 text-muted-foreground/80">
              <Loader2Icon className="size-5.5 animate-spin text-zinc-450 dark:text-zinc-550" />
              <p className="text-xs font-mono tracking-wider text-muted-foreground/50">正在同步云端资源...</p>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          /* Premium minimal empty state */
          <div className="rounded-xl border border-dashed border-zinc-200/80 dark:border-zinc-800/80 bg-card/10 select-none transition-colors">
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card/85 text-muted-foreground/60 shadow-xs">
                <VideoIcon className="size-5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground/80">
                {search || filterPlatform !== "all" || filterTimeframe !== "all" ? "未检索到匹配的视频" : "视频库内暂无内容"}
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/65 leading-normal">
                {search || filterPlatform !== "all" || filterTimeframe !== "all"
                  ? "请重置或精简您的搜索关键字与筛选条件"
                  : "支持粘贴外部平台播放页链接或直接拖拽本地文件，即刻启动分布式解析"}
              </p>
              {(search || filterPlatform !== "all" || filterTimeframe !== "all") ? (
                <div className="mt-5">
                  <Button
                    onClick={() => {
                      setSearch("")
                      setFilterPlatform("all")
                      setFilterTimeframe("all")
                      setCustomStartDate("")
                      setCustomEndDate("")
                    }}
                    size="sm"
                    className="gap-1.5 h-7 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg cursor-pointer"
                  >
                    重置所有筛选
                  </Button>
                </div>
              ) : (
                <div className="mt-5 flex gap-2.5">
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-zinc-200 dark:border-zinc-800 text-foreground/80 hover:bg-muted/30">
                    <SearchIcon className="size-3.5" />
                    AI 对话查找
                  </Button>
                  <Button onClick={() => setIsImportOpen(true)} size="sm" className="gap-1.5 h-7 text-xs bg-foreground text-background hover:bg-foreground/90">
                    <UploadIcon className="size-3.5" />
                    立即上传
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* --- Modern Premium Grid Layout --- */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 animate-in fade-in duration-200">
            {filteredVideos.map((video) => {
              const isDone = video.status === "done"
              const isProcessing = video.status === "downloading" || video.status === "transcribing"
              const isError = video.status === "error"
              const status = statusConfig[video.status] || statusConfig.pending
              const StatusIcon = status.icon

              return (
                <div
                  key={video.id}
                  onClick={() => isDone && router.push(`/videos/${video.id}`)}
                  className={cn(
                    "group relative flex flex-col rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-card/45 overflow-hidden transition-all duration-300 shadow-xs",
                    isDone ? "cursor-pointer hover:border-zinc-400/40 hover:shadow-md" : "bg-zinc-150/5 dark:bg-zinc-900/5",
                    isProcessing && "opacity-95"
                  )}
                >
                  {/* Thumbnail Cover aspect 16:9 */}
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-850 border-b border-zinc-200/20 dark:border-zinc-800/20 flex items-center justify-center select-none">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title || "视频封面"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-1025 group-hover:brightness-103"
                      />
                    ) : (
                      <VideoIcon className="size-5.5 text-muted-foreground/35" />
                    )}

                    {/* Semi-transparent Play Button overlay on Hover */}
                    {isDone && (
                      <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[0.5px]">
                        <div className="h-9 w-9 rounded-full bg-white/95 dark:bg-zinc-950/90 shadow-md flex items-center justify-center text-zinc-900 dark:text-zinc-100 scale-95 group-hover:scale-100 transition-transform duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="size-3.5 ml-0.5"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        </div>
                      </div>
                    )}

                    {/* Micro loading overlay */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/10 dark:bg-black/35 backdrop-blur-[0.5px] flex items-center justify-center">
                        <Loader2Icon className="size-4.5 animate-spin text-white" />
                      </div>
                    )}

                    {/* Status corner badge - strictly hidden for done */}
                    {!isDone && (
                      <div className="absolute top-2.5 right-2.5 select-none">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold border backdrop-blur-md shadow-xs",
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
                    )}
                  </div>

                  {/* Info details */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                    <div className="space-y-1">
                      <h4 className="line-clamp-2 text-xs font-semibold text-foreground/85 leading-snug group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                        {video.title || "未命名视频或解析中..."}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between select-none">
                      <div className="flex items-center gap-1.5">
                        <span className={sourceBadge(video.source)}>
                          {sourceLabel(video.source)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/45 font-mono">
                          {formatDate(video.createdAt)}
                        </span>
                      </div>

                      {/* Float reveal trash button */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDelete(e, video.id)}
                          className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-muted-foreground/35 opacity-0 group-hover:opacity-100 hover:bg-zinc-150/80 dark:hover:bg-zinc-800 hover:text-rose-500 transition-all duration-200 cursor-pointer"
                          title="删除视频"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* --- Premium Elegant List Layout --- */
          <div className="border border-zinc-200/50 dark:border-zinc-800/40 bg-card/35 rounded-xl overflow-hidden divide-y divide-zinc-200/30 dark:divide-zinc-800/20 shadow-[0_1px_3px_rgba(0,0,0,0.01)] animate-in fade-in duration-200">
            {/* Table Header */}
            <div className="hidden sm:flex items-center gap-5 bg-muted/10 px-5 py-2.5 select-none">
              <div className="w-28 shrink-0 text-[10px] font-bold text-muted-foreground/55 uppercase tracking-widest font-mono">封面</div>
              <div className="flex-1 text-[10px] font-bold text-muted-foreground/55 uppercase tracking-widest font-mono">视频标题</div>
              <div className="w-28 shrink-0 text-[10px] font-bold text-muted-foreground/55 uppercase tracking-widest font-mono">平台来源</div>
              <div className="w-28 shrink-0 text-[10px] font-bold text-muted-foreground/55 uppercase tracking-widest font-mono">导入日期</div>
              <div className="w-28 shrink-0 text-[10px] font-bold text-muted-foreground/55 uppercase tracking-widest font-mono">状态</div>
              <div className="w-10 shrink-0 text-right text-[10px] font-bold text-muted-foreground/55 uppercase tracking-widest font-mono">操作</div>
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
                    "group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 px-5 py-4 transition-colors duration-150 select-none",
                    isDone ? "cursor-pointer hover:bg-muted/20" : "bg-muted/5",
                    !isDone && !isProcessing && "opacity-55",
                    isProcessing && "opacity-85"
                  )}
                >
                  {/* Thumbnail Cover — enlarged to 16:9 at w-28 */}
                  <div className="relative h-[63px] w-28 shrink-0 overflow-hidden rounded-lg bg-muted/65 border border-zinc-200/40 dark:border-zinc-800/45 flex items-center justify-center">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title || "视频封面"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <VideoIcon className="size-5 text-muted-foreground/30" />
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[0.5px]">
                        <Loader2Icon className="size-4 animate-spin text-white" />
                      </div>
                    )}
                    {isDone && (
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="h-7 w-7 rounded-full bg-white/90 dark:bg-zinc-950/90 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 ml-0.5 text-zinc-900 dark:text-zinc-100"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title Column */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[13px] font-semibold text-foreground/85 group-hover:text-foreground transition-colors leading-snug tracking-tight">
                        {video.title || "未命名视频或解析中"}
                      </p>
                      {isDone && (
                        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>

                  {/* Platform Column */}
                  <div className="w-28 shrink-0 sm:block flex items-center gap-2">
                    <span className="sm:hidden text-[10px] text-muted-foreground/50">平台：</span>
                    <span className={sourceBadge(video.source)}>
                      {sourceLabel(video.source)}
                    </span>
                  </div>

                  {/* Date Column */}
                  <div className="w-28 shrink-0 sm:block flex items-center gap-2 text-muted-foreground/70 font-mono text-xs">
                    <span className="sm:hidden text-[10px] text-muted-foreground/50">时间：</span>
                    <span>{formatDate(video.createdAt)}</span>
                  </div>

                  {/* Status Column - strictly clean, hide done */}
                  <div className="w-28 shrink-0 sm:block flex items-center gap-2">
                    <span className="sm:hidden text-[10px] text-muted-foreground/50">状态：</span>
                    {!isDone ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold border shadow-xs",
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
                    ) : (
                      // Clean subtle dot for done — no text clutter
                      <span className="size-2 rounded-full bg-zinc-300 dark:bg-zinc-700 hidden sm:inline-block ml-1 opacity-50" />
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="w-10 shrink-0 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDelete(e, video.id)}
                      className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-muted-foreground/45 opacity-0 group-hover:opacity-100 hover:bg-zinc-150/80 dark:hover:bg-zinc-800 hover:text-rose-500 transition-all duration-200 cursor-pointer"
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

      {/* --- Premium Glassmorphic Import Video Modal --- */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-250 select-none">
          <div 
            className="relative w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 px-5.5 py-4 border-b border-zinc-200/40 dark:border-zinc-800/20">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
                <span className="text-xs font-semibold text-foreground/85 uppercase tracking-wider font-mono">导入视频资源</span>
              </div>
              <button 
                onClick={() => {
                  setIsImportOpen(false)
                  setImportMessage(null)
                  setInputValue("")
                  setFileName(null)
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground transition-all duration-150"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5.5 space-y-4">
              
              {/* Segmented Control Tabs */}
              <div className="flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-250/20 dark:border-zinc-800/40">
                <button
                  onClick={() => {
                    setActiveTab("link")
                    setImportMessage(null)
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer",
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
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer",
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
                    "flex items-start gap-2.5 px-3.5 py-3 rounded-lg border text-xs leading-normal font-semibold animate-in fade-in slide-in-from-top-2 duration-200 shadow-3xs",
                    importMessage.type === "success"
                      ? "border-zinc-200/60 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-150"
                      : "border-zinc-200/60 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900 text-zinc-500"
                  )}
                >
                  {importMessage.type === "success" ? (
                    <CheckCircle2Icon className="size-4 shrink-0 mt-0.5 text-zinc-700 dark:text-zinc-300" />
                  ) : (
                    <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-zinc-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold">{importMessage.type === "success" ? "任务已创建" : "导入异常"}</span>
                    <span className="block text-[11px] text-muted-foreground/85 mt-0.5 leading-relaxed">{importMessage.text}</span>
                  </div>
                </div>
              )}

              {/* URL input tab */}
              {activeTab === "link" && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                      视频链接地址
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="粘贴 B站 或 YouTube 视频网页链接..."
                        className="h-10 w-full rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-muted/10 px-3 pl-9.5 text-xs outline-none transition-all focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/45"
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

                  {/* Detection badge */}
                  {platform && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/85 animate-in slide-in-from-left-2 duration-200">
                      <span>已识别目标平台:</span>
                      <span className="rounded px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] border bg-zinc-100 dark:bg-zinc-850 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {platform}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Upload file tab */}
              {activeTab === "file" && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {fileName ? (
                    <div className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-muted/5 text-xs font-semibold shadow-3xs">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/30 text-muted-foreground">
                        <FileVideoIcon className="size-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground/85 font-bold text-[11.5px] leading-tight">{fileName}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 leading-tight">
                          {isImporting ? "正在安全传输文件至云端..." : "准备就绪"}
                        </p>
                      </div>
                      {isImporting && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <Loader2Icon className="size-4 animate-spin text-zinc-400" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                        本地视频文件
                      </label>
                      <label
                        htmlFor="video-upload-area"
                        className={cn(
                          "flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl py-9 px-4 bg-muted/5 hover:bg-muted/15 hover:border-zinc-400/45 transition-all duration-200 cursor-pointer group text-center min-h-[160px]",
                          isImporting && "opacity-60 pointer-events-none"
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-150/50 dark:bg-zinc-900 border border-zinc-250/20 dark:border-zinc-800/25 text-muted-foreground group-hover:text-foreground group-hover:scale-105 transition-all duration-250 mb-3.5 shadow-3xs">
                          <FileVideoIcon className="size-4.5" />
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

              {/* Tip block */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-semibold select-none pt-1">
                <HelpCircleIcon className="size-3" />
                <span>视频提取会自动切分音轨并基于大模型生成知识图谱</span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/30 px-6 py-4 border-t border-zinc-200/40 dark:border-zinc-800/20 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsImportOpen(false)
                  setImportMessage(null)
                  setInputValue("")
                  setFileName(null)
                }}
                disabled={isImporting}
                className="h-8.5 px-4 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all duration-150 cursor-pointer"
              >
                取消
              </Button>
              {activeTab === "link" && (
                <Button
                  onClick={handleImportSend}
                  disabled={isImporting || !inputValue.trim()}
                  className="h-8.5 px-4 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 rounded-lg border-none shadow-xs gap-1.5 transition-all duration-150 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      <span>正在分析...</span>
                    </>
                  ) : (
                    <span>开始分析</span>
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
