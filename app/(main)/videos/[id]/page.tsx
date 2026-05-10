"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PlayIcon, FileTextIcon, MapIcon, MessageCircleIcon } from "lucide-react"

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

export default function VideoDetailPage() {
  const params = useParams()
  const videoId = params.id as string
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="flex h-full gap-4">
        <div className="w-1/2 space-y-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="w-1/2">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
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
    <div className="flex flex-col h-full min-h-0 gap-4">

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left Side - Video Player & Transcript */}
        <div className="w-1/2 flex flex-col min-h-0 shrink-0">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shrink-0">
            {video.url ? (
              <iframe
                src={getEmbedUrl(video.url, video.source)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : video.localPath ? (
              <video
                src={video.localPath}
                controls
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <PlayIcon className="h-12 w-12" />
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardContent className="flex-1 overflow-auto p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium shrink-0">
                  <FileTextIcon className="h-4 w-4" />
                  视频转录字幕
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                  <p className="text-center py-8">
                    {video.status === "done"
                      ? "转录内容加载中..."
                      : "视频处理完成后将显示转录内容"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Tabs */}
        <div className="w-1/2 flex flex-col min-h-0 overflow-hidden">
          <Tabs defaultValue="overview" className="flex flex-col h-full">
            <TabsList className="shrink-0">
              <TabsTrigger value="overview" className="gap-1.5">
                <PlayIcon className="h-4 w-4" />
                视频速览
              </TabsTrigger>
              <TabsTrigger value="mindmap" className="gap-1.5">
                <MapIcon className="h-4 w-4" />
                思维导图
              </TabsTrigger>
              <TabsTrigger value="assistant" className="gap-1.5">
                <MessageCircleIcon className="h-4 w-4" />
                问答助手
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-hidden mt-4">
              <TabsContent value="overview" className="h-full">
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-1 overflow-auto p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">来源</label>
                        <p className="mt-1">{getSourceLabel(video.source)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">状态</label>
                        <p className="mt-1">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              video.status === "done"
                                ? "bg-green-100 text-green-800"
                                : video.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {getStatusLabel(video.status)}
                          </span>
                        </p>
                      </div>
                      {video.duration && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">时长</label>
                          <p className="mt-1">{formatDuration(video.duration)}</p>
                        </div>
                      )}
                      {video.url && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">链接</label>
                          <p className="mt-1 text-sm truncate">{video.url}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mindmap" className="h-full">
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-1 overflow-auto p-4 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>思维导图功能开发中...</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assistant" className="h-full">
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-1 overflow-auto p-4 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>问答助手功能开发中...</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
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