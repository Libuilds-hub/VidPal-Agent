"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { Loader2Icon } from "lucide-react"
import { VideoRecommendationCard, type VideoRecommendation } from "@/components/video-recommendation-card"
import { useSearchParams, useRouter } from "next/navigation"

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

const suggestions = [
  "推荐一些 Claude Code 的进阶教程",
  "总结一下我这周的学习进度",
  "RAG 系统有哪些关键 of Chunk 策略？",
  "搜索 bilibili 上关于 MCP 的视频",
]

function AIAssistantPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentChatId = searchParams.get("id")

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [analyzing, setAnalyzing] = useState<string[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const createWelcomeMessage = () => {
    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    return [
      {
        id: "welcome",
        role: "agent" as const,
        createdAt: timeStr,
        content:
          "你好！我是你的个人视频学习助手。我可以为你检索外部视频资源、深度解析关键知识点并解答复杂的跨视频关联问题。你可以随时在下方开始提问，或者尝试让我推荐当前最热门的前沿知识视频。",
      },
    ]
  }

  // Load chat on mount or when currentChatId changes
  useEffect(() => {
    const localChats = localStorage.getItem("video-shancn-chats")
    const chats = localChats ? JSON.parse(localChats) : []

    if (currentChatId) {
      const foundChat = chats.find((c: any) => c.id === currentChatId)
      if (foundChat) {
        setMessages(foundChat.messages)
        setActiveChatId(currentChatId)
      } else {
        // Chat not found, redirect to default clean chat
        setActiveChatId(null)
        setMessages(createWelcomeMessage())
        router.replace("/ai-assistant")
      }
    } else {
      setActiveChatId(null)
      setMessages(createWelcomeMessage())
    }
  }, [currentChatId, router])

  const saveChatHistory = (chatId: string, updatedMessages: Message[]) => {
    const localChats = localStorage.getItem("video-shancn-chats")
    const chats: any[] = localChats ? JSON.parse(localChats) : []
    const existingIndex = chats.findIndex((c) => c.id === chatId)
    const nowStr = new Date().toISOString()

    // Title from first user prompt
    const firstUserMsg = updatedMessages.find((m) => m.role === "user")?.content || "新对话"
    const title = firstUserMsg.length > 25 ? firstUserMsg.slice(0, 25) + "..." : firstUserMsg

    if (existingIndex > -1) {
      chats[existingIndex] = {
        ...chats[existingIndex],
        messages: updatedMessages,
        updatedAt: nowStr,
        title: chats[existingIndex].title === "新对话" ? title : chats[existingIndex].title
      }
    } else {
      chats.unshift({
        id: chatId,
        title: title,
        messages: updatedMessages,
        createdAt: nowStr,
        updatedAt: nowStr
      })
    }

    localStorage.setItem("video-shancn-chats", JSON.stringify(chats))
  }

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

    // Determine target active chatId
    let targetChatId = activeChatId
    if (!targetChatId) {
      targetChatId = Date.now().toString()
      setActiveChatId(targetChatId)
      router.replace(`/ai-assistant?id=${targetChatId}`)
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput("")

    // Save immediate user message to localStorage
    saveChatHistory(targetChatId, updatedMessages)

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

      setMessages((prev) => {
        const finalMessages = [...prev, agentMsg]
        if (targetChatId) {
          saveChatHistory(targetChatId, finalMessages)
        }
        return finalMessages
      })
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
      setMessages((prev) => {
        const finalMessages = [...prev, msg]
        if (activeChatId) {
          saveChatHistory(activeChatId, finalMessages)
        }
        return finalMessages
      })
    }, 1200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    if (messages.length > 1) {
      if (confirm("确定要新建对话吗？当前对话会自动保存到历史记录中。")) {
        setActiveChatId(null)
        router.push("/ai-assistant")
        setMessages(createWelcomeMessage())
      }
    } else {
      setActiveChatId(null)
      router.push("/ai-assistant")
      setMessages(createWelcomeMessage())
    }
  }

  const isAnalyzing = analyzing.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-2.75rem)] p-6 bg-background">
      {/* Page Title & Controls */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-foreground">AI 智能助手</h1>
        <button
          onClick={handleNewChat}
          className="px-3 py-1.5 border border-border rounded-lg bg-card text-card-foreground text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
          title="新建对话"
        >
          新建对话
        </button>
      </div>

      {/* Chat Messages / Timeline Feed */}
      <div className="flex-1 overflow-y-auto mb-6 p-4 border border-border rounded-xl bg-card/50">
        <div className="space-y-6">
          {messages.map((msg) => {
            const isAgent = msg.role === "agent"
            return (
              <div key={msg.id} className="space-y-1">
                <div className="text-xs text-muted-foreground font-semibold">
                  {isAgent ? "AI Workspace Agent" : "用户"} · {msg.createdAt}
                </div>
                <div className="p-3 bg-muted/40 rounded-lg text-sm text-foreground whitespace-pre-wrap max-w-3xl">
                  {msg.content}
                </div>

                {/* Nested recommendations list */}
                {msg.videos && msg.videos.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-border space-y-3">
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {msg.videos.map((v) => (
                        <VideoRecommendationCard key={v.id} video={v} />
                      ))}
                    </div>
                    
                    {msg.videos.some((v) => v.selected !== false) && (
                      <button
                        disabled={isAnalyzing}
                        onClick={handleAnalyzeSelected}
                        className="px-3 py-1.5 bg-foreground text-background text-xs font-semibold rounded-md cursor-pointer hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? "引擎调度中..." : "分析选中视频"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Quick Prompts / Onboarding Suggestions */}
          {messages.length === 1 && (
            <div className="pt-4 border-t border-border/60">
              <p className="mb-2 text-xs font-bold text-muted-foreground tracking-wide">推荐快速提问 (Suggested Prompts)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="p-3 text-left text-xs text-foreground bg-muted/30 border border-border hover:border-primary/45 rounded-lg cursor-pointer hover:bg-muted/60 transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline thinking indicator */}
          {isAnalyzing && (
            <div className="text-xs text-muted-foreground animate-pulse">
              AI 助手正在分析和索引视频内容...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Composer area */}
      <div className="flex gap-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="问问智能 AI 助手，例如「Claude Code 有什么进阶功能？」..."
          className="flex-1 px-4 py-2 text-sm text-foreground bg-background border border-border rounded-lg outline-none focus:border-primary/60 transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-lg cursor-pointer hover:bg-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          发送
        </button>
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col h-[calc(100vh-2.75rem)] bg-background relative overflow-hidden items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary/60" />
      </div>
    }>
      <AIAssistantPageContent />
    </Suspense>
  )
}
