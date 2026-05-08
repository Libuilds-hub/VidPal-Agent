"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoIcon, SearchIcon, FilterIcon } from "lucide-react"

interface Video {
  id: string
  title: string | null
  source: string
  url: string | null
  localPath: string | null
  status: string
  createdAt: string
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/video")
      const data = await res.json()
      setVideos(data)
    } catch (error) {
      console.error("Failed to fetch videos:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSourceLabel = (source: string) => {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN")
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="搜索视频..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1"
            />
          </div>
          <button className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <FilterIcon className="h-4 w-4" />
            筛选
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>视频列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <VideoIcon className="h-12 w-12 mb-4 animate-pulse" />
              <p>加载中...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <VideoIcon className="h-12 w-12 mb-4" />
              <p>暂无视频</p>
              <p className="text-sm">点击侧边栏"添加视频"开始</p>
            </div>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <VideoIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{video.title || "无标题"}</p>
                    <p className="text-sm text-muted-foreground">
                      {getSourceLabel(video.source)} · {formatDate(video.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      video.status === "done"
                        ? "bg-green-100 text-green-800"
                        : video.status === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {video.status === "pending"
                      ? "待处理"
                      : video.status === "downloading"
                      ? "下载中"
                      : video.status === "done"
                      ? "已完成"
                      : "错误"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}