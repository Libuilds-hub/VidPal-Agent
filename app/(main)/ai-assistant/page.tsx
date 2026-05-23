"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Suspense } from "react"
import { Mic, Send, SparklesIcon } from "lucide-react"
import { ChatMessageBubble } from "@/components/video-detail/assistant/ChatMessage"
import { TypingIndicator } from "@/components/video-detail/assistant/TypingIndicator"
import type { ChatMessage } from "@/components/video-detail/assistant/types"

const MOCK_RESPONSES = [
  "Claude Code 提供了许多进阶功能：1) 使用 /slash commands 快速触发常见操作；2) 通过 CLAUDE.md 文件配置项目级别的指令和行为；3) 利用 memory 系统跨会话保持上下文；4) 使用 skills 和 plugin 扩展能力边界；5) 通过 hooks 在工具调用前后执行自定义逻辑。",
  "关于视频分析，我可以帮助你：提取视频的核心要点、生成结构化的学习笔记、创建思维导图、回答关于视频内容的具体问题。只需要提供视频链接或告诉我你的方向即可。",
  "RAG 系统的 Chunk 策略是影响检索质量的关键：1) 固定大小分块（如 512 tokens），简单但可能切断语义；2) 语义分块，基于段落或句子边界；3) 递归分块，根据文档结构层级切分；4) 滑动窗口分块，保证上下文重叠。选择取决于文档类型和精度要求。",
  "MCP（Model Context Protocol）是 Anthropic 推出的开放协议，标准化 AI 模型与外部工具和数据源的连接。核心概念：Resources（资源）、Tools（工具）、Prompts（提示模板）。",
  "构建高效学习工作流：1) 用知识图谱梳理整体框架；2) 通过视频库系统化收集材料；3) 用 AI 助手提取关键知识点；4) 定期回顾整理笔记。形成「收集-理解-整理-复习」的闭环。",
]

const SUGGESTED_QUESTIONS = [
  "Claude Code 有哪些进阶功能？",
  "如何高效分析一个技术视频？",
  "RAG 系统的 Chunk 策略怎么选？",
  "什么是 MCP 协议？",
  "给我推荐几个前端性能优化的资源",
]

function AIAssistantPageContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [assistantName, setAssistantName] = useState("AI 智能助手")
  const [assistantAvatar, setAssistantAvatar] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("assistant-settings")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.name) setAssistantName(parsed.name)
        if (parsed.avatar) setAssistantAvatar(parsed.avatar)
      }
    } catch {}
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || isTyping) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    setTimeout(() => {
      const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 800 + Math.random() * 700)
  }, [inputValue, isTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2.75rem)] bg-background">
      {messages.length === 0 ? (
        /* Welcome Empty State */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="relative mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-amber-500/10 to-primary/5 rounded-full blur-2xl" />
              <div className="relative h-16 w-16 rounded-2xl bg-white border border-border/40 flex items-center justify-center mx-auto shadow-sm overflow-hidden">
                {assistantAvatar ? (
                  <img src={assistantAvatar} alt={assistantName} className="size-full object-cover" />
                ) : (
                  <SparklesIcon className="h-8 w-8 text-primary/70" />
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground/85">{assistantName}</h3>
            <p className="text-[13px] text-muted-foreground/60 mb-8 leading-relaxed">
              你的个人 AI 学习伙伴，随时解答问题、检索资源、分析内容
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="text-[13px] px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/90 transition-all duration-200 text-muted-foreground/70 hover:text-foreground/80 text-left"
                  onClick={() => setInputValue(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Messages */
        <div className="flex-1 overflow-y-auto p-5 space-y-0 custom-scrollbar">
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message}
              onRegenerate={() => {
                if (isTyping) return
                setIsTyping(true)
                setTimeout(() => {
                  const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
                  setMessages((prev) =>
                    prev.map((m) => m.id === message.id ? { ...m, content: response } : m)
                  )
                  setIsTyping(false)
                }, 800 + Math.random() * 700)
              }}
              onEdit={(newContent) => {
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === message.id)
                  if (idx === -1) return prev
                  const trimmed = prev.slice(0, idx + 1).map((m) =>
                    m.id === message.id ? { ...m, content: newContent } : m
                  )
                  return trimmed
                })
                if (!isTyping) {
                  setIsTyping(true)
                  setTimeout(() => {
                    const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
                    const assistantMessage: ChatMessage = {
                      id: `assistant-${Date.now()}`,
                      role: "assistant",
                      content: response,
                      timestamp: new Date(),
                    }
                    setMessages((prev) => [...prev, assistantMessage])
                    setIsTyping(false)
                  }, 800 + Math.random() * 700)
                }
              }}
            />
          ))}
          {isTyping && (
            <div className="flex gap-2.5 py-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-foreground text-background select-none mt-0.5 overflow-hidden">
                {assistantAvatar ? (
                  <img src={assistantAvatar} alt={assistantName} className="size-full object-cover" />
                ) : (
                  <SparklesIcon className="h-3 w-3" />
                )}
              </div>
              <div className="bg-muted/50 rounded-2xl px-4 py-3">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t border-border/20 p-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-1.5 bg-card rounded-md border border-border/40 p-1.5 transition-all duration-200 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10">
            <button
              type="button"
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-primary/70 hover:bg-primary/[0.06] transition-all duration-200"
            >
              <Mic className="h-4 w-4" />
            </button>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
              className="flex-1 min-h-[36px] max-h-[66px] py-[7px] px-0 resize-none bg-transparent border-0 outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[13px] placeholder:text-muted-foreground/40 leading-[22px] field-sizing-content rounded-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              rows={1}
              disabled={isTyping}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:bg-muted-foreground/30 disabled:shadow-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-2.75rem)] bg-background items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground/40">
          <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" />
          <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.15s" }} />
          <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    }>
      <AIAssistantPageContent />
    </Suspense>
  )
}
