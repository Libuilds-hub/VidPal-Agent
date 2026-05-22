"use client"

import { useState, useRef, useEffect } from "react"
import { SendIcon, BotIcon, UserIcon, Loader2Icon, SparklesIcon, SearchIcon, PlusIcon, ChevronDown, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { VideoRecommendationCard, type VideoRecommendation } from "@/components/video-recommendation-card"

type Message = {
  id: string
  role: "user" | "agent"
  content: string
  createdAt: string
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
    createdAt: "下午 2:30",
    content:
      "你好！我是你的个人视频学习助手。我可以为你检索外部视频资源、深度解析关键知识点并解答复杂的跨视频关联问题。你可以随时在下方开始提问，或者尝试让我推荐当前最热门的前沿知识视频。",
  },
]

const suggestions = [
  "推荐一些 Claude Code 的进阶教程",
  "总结一下我这周的学习进度",
  "RAG 系统有哪些关键的 Chunk 策略？",
  "搜索 bilibili 上关于 MCP 的视频",
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [analyzing, setAnalyzing] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text) return

    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      createdAt: timeStr,
      content: text,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")

    // Agent response simulation
    setTimeout(() => {
      const agentTimeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      const isClaudeCodePrompt = text.toLowerCase().includes("claude code")
      
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        createdAt: agentTimeStr,
        content: isClaudeCodePrompt
          ? "为您在全网索引并筛选出以下 3 个关于 Claude Code 的高质量解析视频（已根据知识匹配度完成综合评级排序）："
          : "收到，我已经记录了您的查询意向。当前本地视频知识引擎正在联机学习中。如需即刻分析某个特定视频，您可以随时在“视频资源库”粘贴该视频的目标页面链接，我将为您执行实时文本提炼与知识结构化分析。",
        videos: isClaudeCodePrompt ? demoVideos : undefined,
      }
      setMessages((prev) => [...prev, agentMsg])
    }, 750)
  }

  const handleAnalyzeSelected = () => {
    const selectedIds = demoVideos.filter((v) => v.selected !== false).map((v) => v.id)
    if (selectedIds.length === 0) return
    setAnalyzing(selectedIds)
    setTimeout(() => {
      setAnalyzing([])
      const timeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      const msg: Message = {
        id: (Date.now() + 2).toString(),
        role: "agent",
        createdAt: timeStr,
        content: `已成功将选中的 ${selectedIds.length} 个视频推送到后台分布式解析通道。系统将自动执行“音轨提取 -> 文本转录 -> 主题索引”。您可以在“视频资源库”面板追踪实时的处理进度。`,
      }
      setMessages((prev) => [...prev, msg])
    }, 1200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isAnalyzing = analyzing.length > 0

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col h-[calc(100vh-2.75rem)] bg-background relative overflow-hidden select-none">
        
        {/* Soft beautiful background gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

        {/* Centered Landing Content */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 max-w-3xl mx-auto w-full z-10">
          
          {/* Greeting */}
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/70 bg-clip-text text-transparent mb-8 text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
            萨芬，我们开始吧
          </h1>

          {/* Gemini-like search pill input */}
          <div className="w-full bg-background border border-border/60 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:border-primary/45 focus-within:border-primary focus-within:ring-[0.5px] focus-within:ring-primary/30 transition-all flex items-center px-4 py-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {/* Left Plus icon */}
            <button className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors mr-1">
              <PlusIcon className="size-5" />
            </button>

            {/* Input field */}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="问问智能 AI 助手..."
              className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground/45 outline-none border-none focus:ring-0 min-w-0"
            />

            {/* Right actions */}
            <div className="flex items-center gap-1 shrink-0 pl-2">
              {/* Model Selector dropdown */}
              <button className="h-8 px-3 rounded-full text-[11px] font-medium text-foreground/75 bg-muted/20 hover:bg-muted/40 hover:text-foreground border border-border/40 flex items-center gap-1 transition-all mr-1.5 active:scale-[0.98]">
                <SparklesIcon className="size-3 text-primary animate-pulse" />
                <span>闪电侠</span>
                <ChevronDown className="size-3 text-muted-foreground/70" />
              </button>

              {/* Mic button */}
              <button className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors mr-1">
                <Mic className="size-4.5" />
              </button>

              {/* Send button (only active when typed) */}
              {input.trim() && (
                <button
                  onClick={() => handleSend()}
                  className="h-8 w-8 rounded-full bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center transition-all animate-in zoom-in-75 duration-150 active:scale-[0.93]"
                  title="发送"
                >
                  <SendIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Prompts / Suggestions */}
          <div className="w-full mt-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            <p className="mb-3 text-[10px] font-bold text-center text-muted-foreground/60 uppercase tracking-widest">推荐快速提问 (Suggested Prompts)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    handleSend(s)
                  }}
                  className="group flex items-start gap-2.5 rounded-2xl border border-border/40 hover:border-primary/30 bg-background/50 hover:bg-background/90 p-3.5 text-left text-xs sm:text-[13px] text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm"
                >
                  <SearchIcon className="size-3.5 mt-0.5 text-muted-foreground/45 group-hover:text-primary transition-colors" />
                  <span className="leading-relaxed">{s}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-2.75rem)] bg-background relative overflow-hidden">
      
      {/* Top right corner utility actions in active chat */}
      <div className="absolute top-4 right-4 z-10 select-none">
        <button
          onClick={() => {
            if (confirm("确定要新建对话并清空当前记录吗？")) {
              setMessages([])
            }
          }}
          className="h-8 w-8 rounded-full border border-border/40 bg-background/50 backdrop-blur hover:bg-muted/40 transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
          title="新建对话"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>

      {/* Chronological Activity Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-background">
        <div className="mx-auto max-w-3xl space-y-6">
          
          {messages.map((msg, idx) => {
            const isAgent = msg.role === "agent"
            return (
              <div key={msg.id} className="relative group animate-in fade-in duration-150">
                
                {/* Vertical timeline connector lines */}
                {idx < messages.length - 1 && isAgent && messages[idx + 1].role === "agent" && (
                  <div className="absolute left-[13px] top-7 bottom-0 w-[1px] bg-border/25 pointer-events-none" />
                )}

                <div className={cn("flex gap-4", !isAgent && "flex-row-reverse")}>
                  {/* Left Avatar Column */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded border shadow-sm select-none",
                      isAgent
                        ? "bg-foreground text-background border-none"
                        : "bg-muted text-muted-foreground border-border/40"
                    )}
                  >
                    {isAgent ? (
                      <SparklesIcon className="size-3.5" />
                    ) : (
                      <UserIcon className="size-3.5" />
                    )}
                  </div>

                  {/* Right Content Column */}
                  <div className={cn("flex-1 min-w-0 space-y-1.5 pb-2 flex flex-col", isAgent ? "items-start" : "items-end")}>
                    
                    {/* Message Header / Meta */}
                    <div className={cn("flex items-center gap-2 select-none", !isAgent && "flex-row-reverse")}>
                      <span className="text-xs font-semibold text-foreground/80">
                        {isAgent ? "AI Workspace Agent" : "You (工作空间所有者)"}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground/50">{msg.createdAt}</span>
                    </div>

                    {/* Simple crisp text, no bubbles for Agent, premium bubbles for User */}
                    <div className={cn(
                      "text-[13px] leading-relaxed font-normal whitespace-pre-wrap",
                      isAgent
                        ? "text-foreground/90"
                        : "text-foreground/95 bg-primary/10 dark:bg-primary/20 border border-primary/10 dark:border-primary/20 px-3.5 py-2 rounded-2xl rounded-tr-none max-w-[85%] text-left"
                    )}>
                      {msg.content}
                    </div>

                    {/* Nested recommendations list */}
                    {msg.videos && msg.videos.length > 0 && (
                      <div className="mt-3.5 space-y-2 max-w-xl">
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-1">
                          {msg.videos.map((v) => (
                            <VideoRecommendationCard key={v.id} video={v} />
                          ))}
                        </div>
                        
                        {msg.videos.some((v) => v.selected !== false) && (
                          <div className="pt-1.5">
                            <button
                              disabled={isAnalyzing}
                              onClick={handleAnalyzeSelected}
                              className="h-7 px-3 text-[11px] font-medium bg-foreground text-background hover:bg-foreground/90 rounded border-none shadow-sm flex items-center gap-1.5 transition-all select-none disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2Icon className="size-3 animate-spin" />
                                  <span>引擎调度中...</span>
                                </>
                              ) : (
                                <>
                                  <SparklesIcon className="size-3" />
                                  <span>分析选中视频</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

              </div>
            )
          })}

          {/* Inline thinking indicator */}
          {isAnalyzing && (
            <div className="flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-foreground text-background select-none">
                <SparklesIcon className="size-3.5" />
              </div>
              <div className="flex-1 space-y-1.5 pb-2">
                <div className="flex items-center gap-2 select-none">
                  <span className="text-xs font-semibold text-foreground/80">AI Workspace Agent</span>
                  <span className="text-[9px] font-mono text-primary animate-pulse">正在索引...</span>
                </div>
                <div className="flex items-center gap-1.5 py-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Workspace Comment Box Composer */}
      <div className="shrink-0 border-t border-border/30 bg-card/25 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center border border-border/45 bg-background rounded-lg focus-within:border-primary/80 focus-within:ring-[0.5px] focus-within:ring-primary/40 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.015)] pr-2">
          
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在工作空间内输入您的问题，例如「Claude Code 有什么核心功能？」..."
            className="flex-1 bg-transparent px-3.5 py-3 text-xs sm:text-[13px] text-foreground placeholder:text-muted-foreground/45 outline-none border-none focus:ring-0 min-w-0"
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className={cn(
              "h-7 w-7 shrink-0 rounded flex items-center justify-center transition-all border-none select-none",
              input.trim()
                ? "bg-foreground text-background hover:bg-foreground/90 cursor-pointer active:scale-[0.95]"
                : "bg-transparent text-muted-foreground/35 cursor-not-allowed"
            )}
            title="发送"
          >
            <SendIcon className="size-3.5" />
          </button>

        </div>
      </div>

    </div>
  )
}
