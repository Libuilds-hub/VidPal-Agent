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
  Search,
  ClockIcon,
  BookOpenIcon,
  LayersIcon,
  SparklesIcon,
  HashIcon,
  ExternalLinkIcon,
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

  useEffect(() => {
    if (activeTranscriptRef.current && transcriptListRef.current) {
      const container = transcriptListRef.current
      const active = activeTranscriptRef.current
      const containerTop = container.scrollTop
      const containerBottom = containerTop + container.clientHeight
      const activeTop = active.offsetTop
      const activeBottom = activeTop + active.clientHeight

      if (activeTop < containerTop || activeBottom > containerBottom) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentPlaybackTime])

  const fetchVideo = async () => {
    try {
      const res = await fetch(`/api/video/${videoId}`)
      const found = await res.json()
      if (found && found.id) {
        if (found.transcripts && typeof found.transcripts === 'string') {
          found.transcripts = JSON.parse(found.transcripts)
        }
        setVideo(found)
      } else {
        setError("视频未找到")
      }
    } catch {
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
        <div className="flex flex-col" style={{ width: `${leftWidth}%` }}>
          <div className="p-4 pb-0">
            <Skeleton className="aspect-video w-full rounded-md" />
          </div>
          <div className="px-4 py-3">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex-1 p-4 pt-0">
            <div className="h-full bg-muted/30 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="w-px shrink-0 bg-border/40" />
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64 rounded-md mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-1.5">
          <div className="text-sm font-medium">{error || "视频未找到"}</div>
          <div className="text-xs text-muted-foreground/60">请检查链接是否正确</div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-1 min-h-0",
        isDragging && "cursor-col-resize select-none"
      )}
    >
      {/* Left Panel: Video & Transcript */}
      <div
        className="flex flex-col bg-background shrink-0 min-h-0 border-r border-border/40"
        style={{ width: `${leftWidth}%` }}
      >
        {/* Video Player */}
        <div className="relative shrink-0 bg-black m-3 mb-0 rounded-md overflow-hidden border border-border/30">
          <div className="relative aspect-[16/9]">
            {video.localPath ? (
              <video
                ref={videoRef}
                src={video.localPath}
                className="w-full h-full"
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2.5">
                <PlayIcon className="h-12 w-12" />
                <span className="text-xs tracking-wide">等待视频文件</span>
              </div>
            )}
          </div>
        </div>

        {/* Transcript Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2.5 flex items-center gap-2 shrink-0 border-b border-border/30">
            <CaptionsIcon className="h-[15px] w-[15px] text-muted-foreground/60" />
            <h3 className="font-medium text-[11px] tracking-widest uppercase text-muted-foreground/50">字幕</h3>
            <div className="ml-auto relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                className="h-6 pl-6 pr-2.5 text-[11px] bg-muted/60 rounded border border-border/40 w-24 focus:w-40 transition-all duration-300 outline-none focus:border-primary/30 placeholder:text-muted-foreground/40"
                placeholder="搜索字幕..."
              />
            </div>
          </div>

          <div ref={transcriptListRef} className="flex-1 overflow-y-auto custom-scrollbar">
            {video.status === "transcribing" ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50 gap-3">
                <div className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">转录中，请稍候...</span>
              </div>
            ) : video.transcripts && video.transcripts.length > 0 ? (
              <div className="py-1">
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
                        "flex gap-3 group cursor-pointer py-2 px-3 transition-all duration-150 border-l-2",
                        isActive
                          ? "border-l-primary bg-muted/50"
                          : "border-l-transparent hover:bg-muted/30"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-mono shrink-0 w-10 leading-5 tabular-nums text-right transition-colors duration-150",
                        isActive ? "text-primary font-medium" : "text-muted-foreground/35 group-hover:text-muted-foreground/55"
                      )}>
                        {item.start}
                      </span>
                      <p className={cn(
                        "text-[12px] leading-[1.6] transition-colors duration-150",
                        isActive ? "text-foreground/90 font-medium" : "text-muted-foreground/60 group-hover:text-muted-foreground/75"
                      )}>
                        {item.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 gap-2">
                <CaptionsIcon className="h-7 w-7 opacity-30" />
                <span className="text-xs">
                  {video.status === "done" ? "暂无转录内容" : "视频处理完成后将显示转录内容"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        className="w-[5px] -ml-[2.5px] -mr-[2.5px] bg-transparent hover:bg-primary/10 transition-colors cursor-col-resize flex items-center justify-center shrink-0 relative group z-10"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-2 -right-2" />
        <div className="h-6 w-0.5 bg-border/50 rounded-full group-hover:bg-primary/40 group-hover:h-10 transition-all duration-200" />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <RightPanel video={video} videoId={videoId} currentPlaybackTime={currentPlaybackTime} onVideoUpdate={(updates) => setVideo((prev) => prev ? { ...prev, ...updates } : prev)} onSeek={(t) => { if (plyrRef.current) { plyrRef.current.currentTime = t; setCurrentPlaybackTime(t) } }} />
      </div>
    </div>
  )
}

function RightPanel({ video, videoId, currentPlaybackTime, onVideoUpdate, onSeek }: { video: Video; videoId: string; currentPlaybackTime: number; onVideoUpdate: (updates: Partial<Video>) => void; onSeek: (t: number) => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("summary")

  const tabs = [
    { id: "summary" as const, label: "视频速览", icon: BookOpenIcon },
    { id: "mindmap" as const, label: "思维导图", icon: LayersIcon },
    { id: "assistant" as const, label: "问答助手", icon: MessageCircleIcon },
  ]

  return (
    <>
      {/* Tab Bar — Linear-style underline tabs */}
      <div className="flex items-center gap-0 px-5 border-b border-border/35 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 h-10 px-4 text-[12px] font-medium transition-colors duration-150 border-b-2 -mb-px",
                isActive
                  ? "border-b-primary text-foreground/90"
                  : "border-b-transparent text-muted-foreground/60 hover:text-muted-foreground/80"
              )}
            >
              <Icon className={cn(
                "h-[13px] w-[13px]",
                isActive ? "text-primary" : "text-current"
              )} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className={cn("flex-1 min-h-0 custom-scrollbar", activeTab !== "assistant" && "overflow-y-auto", activeTab === "assistant" && "flex flex-col")}>
        {activeTab === "summary" && <SummaryContent video={video} currentPlaybackTime={currentPlaybackTime} onSeek={onSeek} />}
        {activeTab === "mindmap" && <MindMap videoId={videoId} mermaidCode={video?.mindmap} onSaved={(mindmap) => onVideoUpdate({ mindmap })} />}
        {activeTab === "assistant" && <QAAssistant />}
      </div>
    </>
  )
}

function SummaryContent({ video, currentPlaybackTime, onSeek }: { video: Video; currentPlaybackTime: number; onSeek: (t: number) => void }) {
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
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 gap-3">
          <SparklesIcon className="h-9 w-9 opacity-20" />
          <span className="text-xs">视频处理完成后将显示完整概述</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-40 w-full rounded-md" />
        <Skeleton className="h-56 w-full rounded-md" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="text-xs text-muted-foreground">{error || "暂无摘要内容"}</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-400">

      {/* Header */}
      <header className="space-y-2.5 pb-5 border-b border-border/30">
        <h1 className="text-[18px] font-semibold tracking-tight text-foreground/90 leading-snug">
          {video.title || "视频分析"}
        </h1>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 font-mono">
            <ExternalLinkIcon className="h-2.5 w-2.5" />
            {getSourceLabel(video.source)}
          </span>
          {video.duration != null && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-2.5 w-2.5" />
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
      </header>

      {/* Overview */}
      <section>
        <h2 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-4">全文概述</h2>
        <div className="rounded-md border border-border/40 bg-card p-5">
          <p className="text-[13px] text-foreground/75 leading-[1.75]">{summary.overview}</p>
        </div>
      </section>

      {/* Key Points */}
      <section>
        <h2 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-4">关键要点</h2>
        <div className="rounded-md border border-border/40 bg-card divide-y divide-border/25">
          {summary.keyPoints.map((point, i) => (
            <div key={i} className="flex gap-3.5 py-3 px-5">
              <span className="flex-shrink-0 w-5 h-5 rounded bg-muted/80 border border-border/40 text-muted-foreground/60 text-[10px] font-mono flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-[13px] text-foreground/75 leading-[1.65] pt-0.5">{point}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-5">段落总结</h2>
        {(() => {
          const totalDuration = video.duration || 1
          const progress = Math.min(Math.max(currentPlaybackTime / totalDuration, 0), 1)
          return (
            <div className="relative pl-7 space-y-3 before:absolute before:left-[16px] before:top-[10px] before:bottom-[10px] before:w-px before:bg-border/40">
              {/* Progress bar */}
              <div className="absolute left-[16px] top-[10px] bottom-[10px] w-px overflow-hidden">
                <div
                  className="absolute left-0 right-0 top-0 bg-primary/50 transition-all duration-300 ease-linear"
                  style={{ bottom: `${(1 - progress) * 100}%` }}
                />
              </div>
              {summary.segments.map((item, i) => {
                  const timeParts = item.time?.split("-") ?? ["0:00", "0:00"]
                  const segStart = timeParts[0] || "0:00"
                  const segEnd = timeParts[1] || timeParts[0] || "0:00"
                  const segStartSec = parseTime(segStart)
                  const segEndSec = parseTime(segEnd)
                  const isActive = currentPlaybackTime >= segStartSec && currentPlaybackTime < segEndSec
                  return (
                <div key={i} className="flex gap-3.5 relative group items-start">
                  <span className={[
                    "absolute -left-[14px] top-[8px] w-[8px] h-[8px] rounded-full border-2 bg-background transition-all duration-150 z-10",
                    isActive
                      ? "border-primary"
                      : "border-border/50 group-hover:border-muted-foreground/40"
                  ].join(" ")} />
                  <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0 min-w-[2.5rem] tabular-nums leading-[22px]">{item.time}</span>
                  <div
                    onClick={() => onSeek(segStartSec)}
                    className={[
                    "rounded-md border p-4 flex-1 transition-all duration-150 cursor-pointer",
                    isActive
                      ? "bg-primary/[0.03] border-primary/20"
                      : "bg-card border-border/40 hover:border-border/60"
                  ].join(" ")}>
                    <h3 className="font-medium text-[13px] text-foreground/85 mb-1.5">{item.title}</h3>
                    <p className="text-[12px] text-muted-foreground/65 leading-[1.6]">{item.content}</p>
                  </div>
                </div>
                  )
              })}
            </div>
          )
        })()}
      </section>
    </div>
  )
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "bilibili": return "B站"
    case "youtube": return "YouTube"
    case "local": return "本地"
    default: return source
  }
}

function parseTime(t: string | undefined | null): number {
  if (!t) return 0
  const parts = t.split(":")
  if (parts.length < 2) return 0
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
