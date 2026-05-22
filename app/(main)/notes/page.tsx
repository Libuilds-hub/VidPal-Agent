"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StickyNoteIcon, VideoIcon, ClockIcon, SearchIcon, QuoteIcon, ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Sample note for design demonstration
const sampleNotes = [
  {
    id: "1",
    text: "MCP 协议的 Session 管理机制和传统 HTTP Session 不同，它更接近于 WebSocket 的长连接模式，需要特别注意断线重连时的状态恢复",
    videoTitle: "Claude Code MCP 协议深入解析",
    timestamp: "12:30",
    source: "bilibili" as const,
    createdAt: "2026-05-20",
  },
  {
    id: "2",
    text: "Chunk 大小选择 512 tokens 在中文场景下效果最好，因为中文 token 化效率比英文低 30% 左右",
    videoTitle: "RAG 应用实战：从原理到部署",
    timestamp: "28:15",
    source: "youtube" as const,
    createdAt: "2026-05-19",
  },
  {
    id: "3",
    text: "Hook 的 middleware 执行顺序是栈式（LIFO），需要特别注意异常处理和超时设置",
    videoTitle: "Claude Code Hook 系统完全指南",
    timestamp: "15:42",
    source: "bilibili" as const,
    createdAt: "2026-05-18",
  },
]

export default function NotesPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">笔记</h1>
            <p className="text-sm text-muted-foreground">
              你在视频学习中的标注和批注
            </p>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="搜索笔记..."
              className="h-9 w-56 rounded-lg border border-border/60 bg-muted/50 pl-9 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Sample notes list — shows design even in "empty" state */}
        {sampleNotes.length > 0 ? (
          <div className="space-y-3">
            {sampleNotes.map((note) => (
              <Card key={note.id} className="group transition-all duration-200 hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <QuoteIcon className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm leading-relaxed text-foreground">
                        {note.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <VideoIcon className="size-3" />
                          {note.videoTitle}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          {note.timestamp}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            note.source === "bilibili"
                              ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}
                        >
                          {note.source === "bilibili" ? "B站" : "YouTube"}
                        </span>
                        <span className="text-muted-foreground/50">{note.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <StickyNoteIcon className="size-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground">还没有笔记</p>
                <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
                  在视频详情页中，选中转录文本即可添加标注。笔记会自动关联到知识图谱中
                </p>
                <Link
                  href="/videos"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
                >
                  去视频库看看
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How-to guide */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">如何使用笔记</CardTitle>
            <CardDescription>笔记是你主动思考的痕迹，而不只是 AI 的总结</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                  1
                </div>
                <p className="text-[13px] font-medium">选中转录文字</p>
                <p className="text-[12px] text-muted-foreground">
                  在视频播放时，选中任意转录段落
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                  2
                </div>
                <p className="text-[13px] font-medium">写下你的想法</p>
                <p className="text-[12px] text-muted-foreground">
                  添加你的理解、疑问或联想
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                  3
                </div>
                <p className="text-[13px] font-medium">查看知识图谱</p>
                <p className="text-[12px] text-muted-foreground">
                  笔记自动关联到知识图谱中的相应节点
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
