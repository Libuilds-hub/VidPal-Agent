"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, SearchIcon, Send, SparklesIcon, SquarePenIcon, Trash2Icon, MessageSquareIcon, PanelLeftIcon } from "lucide-react"
import { ChatMessage } from "./types"
import { ChatMessageBubble } from "./ChatMessage"
import { TypingIndicator } from "./TypingIndicator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MOCK_RESPONSES = [
  "根据视频内容，这个问题涉及到几个关键点：首先，视频中提到了核心概念的定义和背景。其次，相关的实际案例展示了这些理论的应用场景。最后，还有一些实用的技巧可以帮助你更好地理解和应用。",
  "视频中对这个话题进行了详细的探讨。从内容来看，主要包含三个方面：基础概念的解析、实际应用的案例分析，以及常见问题的解决方案。希望这些信息对你有帮助。",
  "这是一个很好的问题！视频中确实有提到相关内容。我来总结一下：视频指出这个主题的核心在于理解其基本原理，并通过具体案例展示了如何将理论付诸实践。",
  "关于您的问题，我需要指出的是，视频中从多个角度进行了分析。从技术层面来看，这涉及到几个重要概念；从实践角度，则需要结合实际情况来灵活运用。",
  "视频内容表明，这个主题可以分为以下几个层次来理解：首先是最基本的概念定义，然后是相关的原理机制，接着是实际的应用场景，最后还有一些需要注意的事项和技巧。",
]

const SUGGESTED_QUESTIONS = [
  "视频的主题是什么？",
  "有哪些关键要点？",
  "总结一下主要内容",
]

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
}

function createConversation(): Conversation {
  return {
    id: `conv-${Date.now()}`,
    title: "新对话",
    messages: [],
    createdAt: Date.now(),
  }
}

export function QAAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [createConversation()])
  const [activeId, setActiveId] = useState(() => conversations[0].id)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find((c) => c.id === activeId) || conversations[0]
  const messages = activeConv.messages

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

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c
        const newMessages = [...c.messages, userMessage]
        return {
          ...c,
          messages: newMessages,
          title: c.messages.length === 0 ? trimmed.slice(0, 20) + (trimmed.length > 20 ? "…" : "") : c.title,
        }
      })
    )
    setInputValue("")
    setIsTyping(true)

    const delay = 800 + Math.random() * 700
    setTimeout(() => {
      const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c
          return { ...c, messages: [...c.messages, assistantMessage] }
        })
      )
      setIsTyping(false)
    }, delay)
  }, [inputValue, isTyping, activeId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewConversation = () => {
    const conv = createConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
  }

  const handleDeleteConversation = (id: string) => {
    if (confirmDelete === id) {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (id === activeId && filtered.length > 0) {
          setActiveId(filtered[0].id)
        }
        return filtered.length > 0 ? filtered : [createConversation()]
      })
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <div className="flex h-full">
      {/* Conversation Sidebar */}
      <div className={cn(
        "shrink-0 border-r border-border/30 flex flex-col bg-[#F8F7F5] transition-all duration-300 overflow-hidden",
        sidebarOpen ? "w-[180px]" : "w-0 border-r-0"
      )}>
        <div className="px-3 pt-3 pb-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/50">对话列表</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-1.5 space-y-0.5">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => { setActiveId(conv.id); setConfirmDelete(null) }}
              className={cn(
                "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200",
                activeId === conv.id
                  ? "bg-white shadow-sm ring-1 ring-black/[0.04]"
                  : "hover:bg-white/60"
              )}
            >
              <MessageSquareIcon className={cn(
                "h-3.5 w-3.5 shrink-0",
                activeId === conv.id ? "text-primary/60" : "text-muted-foreground/30"
              )} />
              <span className={cn(
                "text-[12px] truncate flex-1 leading-5",
                activeId === conv.id ? "text-foreground/80 font-medium" : "text-muted-foreground/55"
              )}>
                {conv.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteConversation(conv.id)
                }}
                className={cn(
                  "h-5 w-5 flex items-center justify-center rounded transition-all duration-200 shrink-0",
                  confirmDelete === conv.id
                    ? "opacity-100 bg-red-50 text-red-500"
                    : "opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50"
                )}
              >
                <Trash2Icon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Floating action group */}
        <div className="absolute left-3 top-3 z-20 flex items-center rounded-lg bg-white/80 border border-border/30 overflow-hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-7 w-7 flex items-center justify-center text-muted-foreground/45 hover:text-muted-foreground/70 hover:bg-muted/50 transition-all duration-200"
            title={sidebarOpen ? "收起对话列表" : "展开对话列表"}
          >
            <PanelLeftIcon className={cn("h-4 w-4 transition-transform duration-300", sidebarOpen && "rotate-180")} />
          </button>
          <span className="w-px h-3 bg-border/30" />
          <button
            className="h-7 w-7 flex items-center justify-center text-muted-foreground/45 hover:text-muted-foreground/70 hover:bg-muted/50 transition-all duration-200"
            title="搜索对话"
          >
            <SearchIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleNewConversation}
            className="h-7 w-7 flex items-center justify-center text-muted-foreground/45 hover:text-primary hover:bg-primary/[0.06] transition-all duration-200"
            title="新建对话"
          >
            <SquarePenIcon className="h-[15px] w-[15px]" />
          </button>
        </div>
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-sm w-full text-center">
              <div className="relative mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-amber-500/10 to-primary/5 rounded-full blur-2xl" />
                <div className="relative h-16 w-16 rounded-2xl bg-white border border-border/40 flex items-center justify-center mx-auto shadow-sm">
                  <SparklesIcon className="h-8 w-8 text-primary/70" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground/85">视频问答助手</h3>
              <p className="text-[13px] text-muted-foreground/60 mb-6 leading-relaxed">
                基于视频内容智能分析，随时为你答疑解惑
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className="text-[13px] px-4 py-2.5 rounded-xl bg-muted/50 hover:bg-muted/80 transition-all duration-200 text-muted-foreground/70 hover:text-foreground/80 text-left"
                    onClick={() => setInputValue(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isTyping && (
              <div className="flex gap-2.5">
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
          <div className="mx-auto">
            <div className="flex items-end gap-1.5 bg-white rounded-2xl border border-border/30 p-1.5 shadow-sm transition-all duration-300 focus-within:shadow-md focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5">
              <button
                type="button"
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-primary/70 hover:bg-primary/[0.06] transition-all duration-200"
              >
                <Mic className="h-4 w-4" />
              </button>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的问题..."
                className="flex-1 min-h-0 h-9 max-h-[120px] py-0 px-0 resize-none bg-transparent border-0 outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[14px] placeholder:text-muted-foreground/40 leading-9 field-sizing-content"
                rows={1}
                disabled={isTyping}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-200 shadow-sm disabled:opacity-30 disabled:bg-muted-foreground/20 disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
