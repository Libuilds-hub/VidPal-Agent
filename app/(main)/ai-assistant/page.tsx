"use client"

import { useState, useRef, useEffect } from "react"
import { SendIcon, BotIcon, UserIcon, Loader2Icon, SparklesIcon, SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { VideoRecommendationCard, type VideoRecommendation } from "@/components/video-recommendation-card"

type Message = {
  id: string
  role: "user" | "agent"
  content: string
  videos?: VideoRecommendation[]
}

const demoVideos: VideoRecommendation[] = [
  {
    id: "v1",
    title: "Claude Code 终极指南：从入门到精通",
    source: "bilibili",
    duration: "24:18",
    quality: 94,
  },
  {
    id: "v2",
    title: "用 Claude Code 构建全栈应用的完整流程",
    source: "youtube",
    duration: "38:42",
    quality: 91,
  },
  {
    id: "v3",
    title: "Claude Code MCP 协议深入解析与实战",
    source: "bilibili",
    duration: "15:30",
    quality: 87,
  },
]

const welcomeMessages: Message[] = [
  {
    id: "welcome",
    role: "agent",
    content:
      "你好！我是你的视频学习助手。我可以帮你搜索高质量视频、分析视频内容、回答跨视频的问题。试试问我吧——比如「帮我找 Claude Code 的教程」或「我上周学的 RAG，还有什么需要补充的？",
  },
]

const suggestions = [
  "帮我找 Claude Code 的教程",
  "我这周学了哪些知识？",
  "推荐一些深度学习的高质量视频",
  "搜索关于 MCP 协议的视频",
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Start with demo conversation for visual showcase
    return [
      welcomeMessages[0],
      {
        id: "demo-user",
        role: "user",
        content: "我想学习 Claude Code，帮我找一些高质量的视频",
      },
      {
        id: "demo-agent",
        role: "agent",
        content: "好的，我为你找到了 3 个关于 Claude Code 的高质量视频，按评分排序：",
        videos: demoVideos,
      },
    ]
  })
  const [input, setInput] = useState("")
  const [analyzing, setAnalyzing] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")

    // Simulate agent response
    setTimeout(() => {
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content:
          "我理解你的问题。目前我正在学习如何更好地帮你找到高质量视频。你可以先尝试粘贴一个 B站或 YouTube 视频链接到视频库，或者告诉我具体想搜索什么主题。",
      }
      setMessages((prev) => [...prev, agentMsg])
    }, 800)
  }

  const handleAnalyzeSelected = () => {
    const selectedIds = demoVideos.filter((v) => v.selected !== false).map((v) => v.id)
    if (selectedIds.length === 0) return
    setAnalyzing(selectedIds)
    setTimeout(() => {
      setAnalyzing([])
      const msg: Message = {
        id: (Date.now() + 2).toString(),
        role: "agent",
        content: `已开始分析 ${selectedIds.length} 个视频，完成后我会通知你。你可以在视频库中查看分析进度。`,
      }
      setMessages((prev) => [...prev, msg])
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isAnalyzing = analyzing.length > 0

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-4",
                msg.role === "user" && "flex-row-reverse"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  msg.role === "agent"
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {msg.role === "agent" ? (
                  <BotIcon className="size-4" />
                ) : (
                  <UserIcon className="size-4" />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "max-w-[85%] space-y-3",
                  msg.role === "user" && "flex flex-col items-end"
                )}
              >
                {/* Text bubble */}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "agent"
                      ? "bg-muted/70 text-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {msg.content}
                </div>

                {/* Video cards */}
                {msg.videos && msg.videos.length > 0 && (
                  <div className="space-y-2 max-w-md">
                    {msg.videos.map((v) => (
                      <VideoRecommendationCard key={v.id} video={v} />
                    ))}
                    {msg.videos.some((v) => v.selected !== false) && (
                      <button
                        disabled={isAnalyzing}
                        onClick={handleAnalyzeSelected}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]",
                          isAnalyzing && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2Icon className="size-3.5 animate-spin" />
                            分析中...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="size-3.5" />
                            分析选中视频
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isAnalyzing && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/20">
                <BotIcon className="size-4" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-muted/70 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestions - show when minimal messages */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="mx-auto max-w-3xl">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground/60">试试这些</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s)
                    inputRef.current?.focus()
                  }}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-[13px] text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                >
                  <SearchIcon className="size-3 text-muted-foreground/40 group-hover:text-primary/70" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，让 Agent 帮你找视频、回答问题..."
              className="w-full rounded-xl border border-border/60 bg-muted/50 px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.95]"
                : "bg-muted text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <SendIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
