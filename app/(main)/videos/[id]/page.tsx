"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import "plyr/dist/plyr.css"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  PlayIcon,
  FileTextIcon,
  MapIcon,
  MessageCircleIcon,
  Search,
  GripVertical
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
        <div className="relative aspect-[16/9] bg-black shrink-0">
          {video.localPath ? (
            <video
              ref={videoRef}
              src={video.localPath}
              className="w-full h-full"
              style={{ objectFit: 'contain' }}
            />
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

          <div ref={transcriptListRef} className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {video.status === "transcribing" ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                转录中，请稍候...
              </div>
            ) : video.transcripts && video.transcripts.length > 0 ? (
              // Show real transcripts
              <div className="space-y-2">
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
                        "flex gap-3 group cursor-pointer py-1 px-2 rounded-lg",
                        isActive && ["font-medium", "bg-blue-50"]
                      )}
                    >
                      <span className={cn(
                        "text-xs font-mono shrink-0 w-10 leading-5",
                        isActive ? "text-blue-600" : "text-gray-400"
                      )}>
                        {item.start}
                      </span>
                      <p className={cn(
                        "text-sm leading-5",
                        isActive ? "text-black" : "text-gray-400"
                      )}>
                        {item.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Show placeholder when no transcripts
              <div className="text-center py-8 text-sm text-muted-foreground">
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
        <RightPanel video={video} videoId={videoId} />
      </div>
    </div>
  )
}

function RightPanel({ video, videoId }: { video: Video; videoId: string }) {
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
        {activeTab === "mindmap" && <MindMap videoId={videoId} mermaidCode={video?.mindmap} />}
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
      <div className="max-w-4xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold mb-8">{video.title || "视频分析"}</h1>
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-4">全文概述</h2>
            <div className="text-muted-foreground leading-relaxed space-y-4 text-sm">
              <p>视频处理完成后将显示完整的视频概述内容。</p>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold mb-8">{video.title || "视频分析"}</h1>
        <div className="space-y-8">
          <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-48 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="max-w-4xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold mb-8">{video.title || "视频分析"}</h1>
        <div className="text-muted-foreground text-sm">{error || "暂无摘要内容"}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold mb-8">{video.title || "视频分析"}</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-4">全文概述</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4 text-sm">
            <p>{summary.overview}</p>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">关键要点</h2>
          </div>
          <div className="bg-muted/30 rounded-xl p-6 space-y-3">
            {summary.keyPoints.map((point, i) => (
              <div key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-2" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-6">段落总结</h2>
          <div className="relative pl-4 space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent before:content-['']">
            {summary.segments.map((item, i) => (
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