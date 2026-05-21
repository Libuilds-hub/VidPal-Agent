"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import "plyr/dist/plyr.css"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  PlayIcon,
  CaptionsIcon,
  MapIcon,
  MessageCircleIcon,
  Search
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
  transcripts: TranscriptItem[] | null
  mindmap: string | null
  createdAt: string
  updatedAt: string
}

interface TranscriptItem {
  start: string
  startTime: number
  end: string
  text: string
}

type TabId = "summary" | "mindmap" | "assistant"

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const plyrRef = useRef<Plyr | null>(null)
  const transcriptListRef = useRef<HTMLDivElement>(null)
  const activeTranscriptRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchVideo()
  }, [videoId])

  // Initialize Plyr when video element is available
  useEffect(() => {
    let plyrInstance: Plyr | null = null

    const initPlyr = async () => {
      if (videoRef.current && video?.localPath && !plyrRef.current) {
        const PlyrModule = await import("plyr")
        const PlyrClass = PlyrModule.default || PlyrModule
        plyrInstance = new PlyrClass(videoRef.current, {
          controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
          settings: ['quality', 'speed'],
          ratio: '16:9',
        })
        plyrRef.current = plyrInstance

        // Listen to timeupdate event to sync transcript
        plyrInstance.on('timeupdate', () => {
          if (plyrInstance) {
            setCurrentPlaybackTime(plyrInstance.currentTime)
          }
        })
      }
    }

    initPlyr()

    return () => {
      if (plyrRef.current) {
        plyrRef.current.destroy()
        plyrRef.current = null
      }
    }
  }, [video?.localPath])

  // Scroll active transcript into view
  useEffect(() => {
    if (activeTranscriptRef.current && transcriptListRef.current) {
      activeTranscriptRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [currentPlaybackTime])

  const fetchVideo = async () => {
    try {
      const res = await fetch(`/api/video/${videoId}`)
      const found = await res.json()
      if (found && found.id) {
        // Parse transcripts from JSON string
        if (found.transcripts && typeof found.transcripts === 'string') {
          found.transcripts = JSON.parse(found.transcripts)
        }
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
          <div className="p-4 pb-0">
            <Skeleton className="aspect-video w-full rounded-2xl" />
          </div>
          <div className="px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex-1 p-4 pt-0">
            <div className="h-full bg-muted/30 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="w-[3px] shrink-0" />
        <div className="flex-1 bg-[#FAF9F7] dark:bg-background">
          <div className="px-5 py-3">
            <Skeleton className="h-9 w-64 rounded-full" />
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
        <div className="relative shrink-0 bg-[#0a0a0b] rounded-2xl overflow-hidden m-4 mb-0 ring-1 ring-white/5">
          <div className="relative aspect-[16/9]">
            {video.localPath ? (
              <video
                ref={videoRef}
                src={video.localPath}
                className="w-full h-full"
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/20">
                <PlayIcon className="h-12 w-12" />
              </div>
            )}
          </div>
        </div>

        {/* Transcript Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="px-4 py-3 flex items-center gap-2 shrink-0">
            <CaptionsIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-xs tracking-wide uppercase text-muted-foreground">字幕</h3>
            <div className="ml-auto relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                className="h-7 pl-8 pr-3 text-xs bg-muted/40 rounded-full w-28 focus:w-44 transition-all duration-200 outline-none border-none placeholder:text-muted-foreground/50"
                placeholder="搜索..."
              />
            </div>
          </div>

          <div ref={transcriptListRef} className="flex-1 overflow-y-auto px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {video.status === "transcribing" ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                转录中，请稍候...
              </div>
            ) : video.transcripts && video.transcripts.length > 0 ? (
              <div className="py-2">
                {video.transcripts.map((item, index) => {
                  const isActive = currentPlaybackTime >= item.startTime &&
                    (index === video.transcripts!.length - 1 || currentPlaybackTime < video.transcripts![index + 1].startTime)
                  return (
                    <div
                      key={index}
                      ref={isActive ? (el: HTMLDivElement | null) => { activeTranscriptRef.current = el } : null}
                      onClick={() => {
                        if (plyrRef.current) {
                          plyrRef.current.currentTime = item.startTime
                          setCurrentPlaybackTime(item.startTime)
                        }
                      }}
                      className={cn(
                        "flex gap-3 group cursor-pointer py-2 px-3 rounded-lg border-l-2 transition-all duration-200",
                        isActive
                          ? "border-l-indigo-500 bg-indigo-50/70 shadow-sm"
                          : "border-l-transparent hover:bg-muted/40"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-mono shrink-0 w-10 leading-5 tabular-nums",
                        isActive ? "text-indigo-600 font-medium" : "text-muted-foreground/50"
                      )}>
                        {item.start}
                      </span>
                      <p className={cn(
                        "text-sm leading-5",
                        isActive ? "text-foreground font-medium" : "text-muted-foreground/70"
                      )}>
                        {item.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {video.status === "done"
                  ? "暂无转录内容"
                  : "视频处理完成后将显示转录内容"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        className="w-[3px] bg-transparent hover:bg-indigo-200/50 transition-colors cursor-col-resize flex items-center justify-center shrink-0 relative group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-2 -right-2 z-10" />
        <div className="h-10 w-[3px] bg-border/80 rounded-full group-hover:bg-indigo-400/60 transition-colors" />
      </div>

      {/* Right Panel: Content Tabs */}
      <div className="flex-1 flex flex-col min-w-0 border-t bg-[#FAF9F7] dark:bg-background">
        <RightPanel video={video} videoId={videoId} onVideoUpdate={(updates) => setVideo((prev) => prev ? { ...prev, ...updates } : prev)} />
      </div>
    </div>
  )
}

function RightPanel({ video, videoId, onVideoUpdate }: { video: Video; videoId: string; onVideoUpdate: (updates: Partial<Video>) => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("summary")

  const tabs = [
    { id: "summary" as const, label: "视频速览", icon: PlayIcon },
    { id: "mindmap" as const, label: "思维导图", icon: MapIcon },
    { id: "assistant" as const, label: "问答助手", icon: MessageCircleIcon },
  ]

  return (
    <>
      {/* Tab Bar */}
      <div className="px-5 py-3 shrink-0">
        <div className="flex gap-1.5 bg-muted/60 rounded-full p-1 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2",
                  activeTab === tab.id
                    ? "bg-white dark:bg-foreground dark:text-background text-foreground shadow-sm ring-1 ring-black/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {activeTab === "summary" && <SummaryContent video={video} />}
        {activeTab === "mindmap" && <MindMap videoId={videoId} mermaidCode={video?.mindmap} onSaved={(mindmap) => onVideoUpdate({ mindmap })} />}
        {activeTab === "assistant" && <QAAssistant />}
      </div>
    </>
  )
}

function SummaryContent({ video }: { video: Video }) {
  const [summary, setSummary] = useState<{
    overview: string
    keyPoints: string[]
    segments: { time: string; title: string; content: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (video.status !== "done") return

    async function fetchSummary() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/video/${video.id}/summary`)
        const data = await res.json()
        if (res.ok && data.summary) {
          setSummary(JSON.parse(data.summary))
        }
      } catch {
        setError("摘要加载失败")
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [video.id, video.status])

  if (video.status !== "done") {
    return (
      <div className="max-w-3xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-10">
          <section>
            <h2 className="text-xs font-medium tracking-wider uppercase text-muted-foreground/70 mb-4">全文概述</h2>
            <div className="text-muted-foreground leading-relaxed text-sm">
              <p>视频处理完成后将显示完整的视频概述内容。</p>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-10">
          <div className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
          <div className="h-48 bg-muted/40 rounded-2xl animate-pulse" />
          <div className="h-64 bg-muted/40 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="max-w-3xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-muted-foreground text-sm">{error || "暂无摘要内容"}</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Video Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground/90">
          {video.title || "视频分析"}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground/70">
            {getSourceLabel(video.source)}
          </span>
          {video.duration != null && (
            <span className="text-xs text-muted-foreground/50">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-10">
        {/* Overview */}
        <section>
          <h2 className="text-xs font-medium tracking-wider uppercase text-muted-foreground/70 mb-4">全文概述</h2>
          <div className="text-foreground/80 leading-relaxed text-[15px]">
            <p>{summary.overview}</p>
          </div>
        </section>

        {/* Key Points */}
        <section>
          <h2 className="text-xs font-medium tracking-wider uppercase text-muted-foreground/70 mb-4">关键要点</h2>
          <div className="bg-white dark:bg-card rounded-2xl border border-border/40 p-6 space-y-3">
            {summary.keyPoints.map((point, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-foreground/75 leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="text-xs font-medium tracking-wider uppercase text-muted-foreground/70 mb-6">段落总结</h2>
          <div className="relative pl-5 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
            {summary.segments.map((item, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="absolute -left-[23px] top-1.5 w-[13px] h-[13px] rounded-full bg-white dark:bg-card border-2 border-indigo-300 dark:border-indigo-600 ring-4 ring-[#FAF9F7] dark:ring-background z-10" />
                <span className="text-xs font-mono text-muted-foreground/60 shrink-0 mt-0.5 min-w-[3rem] tabular-nums">{item.time}</span>
                <div className="bg-white dark:bg-card border border-border/30 rounded-xl p-5 flex-1 hover:border-border/60 hover:shadow-sm transition-all duration-200 cursor-default group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm text-foreground/85 group-hover:text-foreground transition-colors">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">
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