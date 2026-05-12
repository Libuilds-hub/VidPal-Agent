"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  PlayIcon,
  FileTextIcon,
  MapIcon,
  MessageCircleIcon,
  Search,
  GripVertical,
  PlayCircle
} from "lucide-react"
import { MindMap } from "@/components/video-detail/mind-map/MindMap"
import { QAAssistant } from "@/components/video-detail/assistant/QAAssistant"

interface Video {
  id: string
  title: string | null
  source: string
  url: string | null
  localPath: string | null
  duration: number | null
  thumbnail: string | null
  status: string
  createdAt: string
  updatedAt: string
}

type TabId = "summary" | "mindmap" | "assistant"

// Mock transcript data for demo
const TRANSCRIPT_ITEMS = [
  { time: "00:00", startTime: 0, text: "欢迎大家来到本期视频，今天我们将深入探讨一个非常重要的话题。" },
  { time: "00:15", startTime: 15, text: "首先，让我们了解一下这个主题的背景和现状。" },
  { time: "00:32", startTime: 32, text: "在过去的几年里，这个领域发生了巨大的变化和发展。" },
  { time: "01:05", startTime: 65, text: "接下来我会为大家详细介绍几个关键的概念和原理。" },
  { time: "01:28", startTime: 88, text: "通过实际案例的分析，我们可以更好地理解这些理论知识。" },
  { time: "02:10", startTime: 130, text: "现在让我们来看一看具体的应用场景和使用方法。" },
  { time: "02:45", startTime: 165, text: "总结一下今天的内容，我们学到了很多实用的技巧。" },
]

export default function VideoDetailPage() {
  const params = useParams()
  const videoId = params.id as string
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leftWidth, setLeftWidth] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchVideo()
  }, [videoId])

  const fetchVideo = async () => {
    try {
      const res = await fetch("/api/video")
      const videos = await res.json()
      const found = videos.find((v: Video) => v.id === videoId)
      if (found) {
        setVideo(found)
      } else {
        setError("视频未找到")
      }
    } catch (err) {
      setError("加载失败")
    } finally {
      setLoading(false)
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100
      if (newLeftWidth >= 33.33 && newLeftWidth <= 66.67) {
        setLeftWidth(newLeftWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0">
        <div className="h-full flex flex-col" style={{ width: `${leftWidth}%` }}>
          <Skeleton className="aspect-video w-full" />
          <div className="flex-1 border-t p-4">
            <div className="h-full bg-muted/50 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="w-1 shrink-0" />
        <div className="flex-1 bg-[#F8F9FA] dark:bg-background">
          <div className="h-[54px] border-b px-6 flex items-center gap-8">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {error || "视频未找到"}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-1 min-h-0 overflow-hidden",
        isDragging && "cursor-col-resize select-none"
      )}
    >
      {/* Left Panel: Video & Transcript */}
      <div
        className="flex flex-col border-r bg-card shrink-0 min-h-0"
        style={{ width: `${leftWidth}%` }}
      >
        {/* Video Player */}
        <div className="relative aspect-video bg-black shrink-0">
          {video.url ? (
            <iframe
              src={getEmbedUrl(video.url, video.source)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : video.localPath ? (
            <video src={video.localPath} controls className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <PlayIcon className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Transcript Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
          <div className="p-3 border-b flex items-center gap-2">
            <FileTextIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">视频转录</h3>
            <div className="ml-auto relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-8 pl-8 pr-3 text-xs bg-muted/50 rounded-lg w-32 focus:w-48 transition-all outline-none border-none placeholder:text-muted-foreground"
                placeholder="搜索转录内容..."
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {video.status === "done" ? (
              // Show transcripts when video is processed
              <div className="space-y-4">
                {TRANSCRIPT_ITEMS.map((item, index) => {
                  const isActive = currentPlaybackTime >= item.startTime &&
                    (index === TRANSCRIPT_ITEMS.length - 1 || currentPlaybackTime < TRANSCRIPT_ITEMS[index + 1].startTime)
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-4 group hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-all cursor-pointer",
                        isActive && "bg-blue-50/50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-mono font-medium shrink-0 mt-0.5 transition-opacity",
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-primary opacity-70 group-hover:opacity-100"
                      )}>
                        {item.time}
                      </span>
                      <p className={cn(
                        "text-sm leading-relaxed transition-colors",
                        isActive
                          ? "text-foreground font-medium"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {item.text}
                      </p>
                      {isActive && (
                        <PlayCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              // Show placeholder when video is not yet processed
              <div className="text-center py-8 text-sm text-muted-foreground">
                {video.status === "done"
                  ? "转录内容加载中..."
                  : "视频处理完成后将显示转录内容"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize flex items-center justify-center shrink-0 relative group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-2 -right-2 z-10" />
        <div className="h-8 w-4 bg-background border rounded-sm flex items-center justify-center shadow-sm group-hover:border-primary/50">
          <GripVertical className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
        </div>
      </div>

      {/* Right Panel: Content Tabs */}
      <div className="flex-1 flex flex-col bg-[#F8F9FA] dark:bg-background min-w-0 border-t">
        <RightPanel video={video} />
      </div>
    </div>
  )
}

function RightPanel({ video }: { video: Video }) {
  const [activeTab, setActiveTab] = useState<TabId>("summary")

  const tabs = [
    { id: "summary" as const, label: "视频速览", icon: PlayIcon },
    { id: "mindmap" as const, label: "思维导图", icon: MapIcon },
    { id: "assistant" as const, label: "问答助手", icon: MessageCircleIcon },
  ]

  return (
    <>
      {/* Tab Bar */}
      <div className="bg-white dark:bg-card border-b px-6 shrink-0">
        <div className="flex gap-8 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-4 text-sm font-medium relative transition-colors flex items-center gap-2",
                  activeTab === tab.id
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {activeTab === "summary" && <SummaryContent video={video} />}
        {activeTab === "mindmap" && <MindMap />}
        {activeTab === "assistant" && <QAAssistant />}
      </div>
    </>
  )
}

function SummaryContent({ video }: { video: Video }) {
  return (
    <div className="max-w-4xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold mb-8">{video.title || "视频分析"}</h1>

      <div className="space-y-8">
        {/* Overview Section */}
        <section>
          <h2 className="text-lg font-bold mb-4">全文概述</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 text-sm">
            <p>
              视频分析完成后将显示完整的视频概述内容。这里将展示视频的主要内容和核心要点，
              帮助用户快速了解视频的主题和关键信息。
            </p>
          </div>
        </section>

        {/* Key Points Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">关键要点</h2>
          </div>
          <div className="bg-muted/30 rounded-xl p-6 space-y-3">
            {[
              "视频内容已完成分析和处理",
              "相关要点将在分析完成后显示",
              "思维导图将帮助理解知识点关联",
              "支持点击跳转至相关时间点"
            ].map((point, i) => (
              <div key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-2" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Segments Section - Timeline Style */}
        <section>
          <h2 className="text-lg font-bold mb-6">段落总结</h2>
          <div className="relative pl-4 space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent before:content-['']">
            {[
              {
                time: "00:00",
                title: "视频导入",
                content: "视频已成功导入系统，开始进行分析处理流程。"
              },
              {
                time: "02:30",
                title: "内容提取",
                content: "正在提取视频中的音频内容和视觉关键帧信息。"
              },
              {
                time: "05:00",
                title: "AI 分析",
                content: "利用 AI 技术对视频内容进行深入分析和理解。"
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="absolute -left-[15px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-500 ring-4 ring-white dark:ring-background z-10" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0 mt-0.5 min-w-[3rem]">{item.time}</span>
                <div className="bg-blue-50/50 dark:bg-card border border-blue-100 dark:border-border rounded-xl p-5 flex-1 hover:shadow-md transition-shadow cursor-default group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base text-foreground group-hover:text-blue-700 transition-colors">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function getEmbedUrl(url: string, source: string): string {
  if (source === "bilibili") {
    const match = url.match(/bilibili\.com\/video\/(BV\w+)/)
    if (match) {
      return `https://player.bilibili.com/player.html?bvid=${match[1]}&p=1`
    }
  } else if (source === "youtube") {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/)
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
  }
  return url
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "bilibili":
      return "B站"
    case "youtube":
      return "YouTube"
    case "local":
      return "本地"
    default:
      return source
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "待处理"
    case "downloading":
      return "下载中"
    case "done":
      return "已完成"
    case "error":
      return "错误"
    default:
      return status
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}