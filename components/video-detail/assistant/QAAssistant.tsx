"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, PlusIcon, SearchIcon, Send, SparklesIcon, EllipsisIcon, Trash2Icon, ChevronLeftIcon, XIcon, MessageSquareIcon } from "lucide-react"
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
  const [conversations, setConversations] = useState<Conversation[]>(() => [])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConv = conversations.find((c) => c.id === activeId) ?? null
  const messages = activeConv?.messages ?? []

  const searchResults = searchQuery.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true)
    setSearchQuery("")
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }, [])

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery("")
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchOpen ? handleCloseSearch() : handleOpenSearch()
      }
      if (e.key === "Escape" && searchOpen) {
        handleCloseSearch()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen, handleOpenSearch, handleCloseSearch])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || isTyping) return

    let targetId = activeId
    if (!targetId) {
      const conv = createConversation()
      setConversations((prev) => [conv, ...prev])
      targetId = conv.id
      setActiveId(conv.id)
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== targetId) return c
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
          if (c.id !== targetId) return c
          return { ...c, messages: [...c.messages, assistantMessage] }
        })
      )
      setIsTyping(false)
    }, delay)
  }, [inputValue, isTyping, activeId, setActiveId])

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
    setSidebarOpen(false)
    setSearchOpen(false)
    setSearchQuery("")
    setTimeout(() => textareaRef.current?.focus(), 150)
  }

  const handleDeleteConversation = (id: string) => {
    if (confirmDelete === id) {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (id === activeId && filtered.length > 0) {
          setActiveId(filtered[0].id)
        }
        if (filtered.length === 0) setActiveId(null)
        return filtered
      })
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <div className="flex h-full relative">
      {/* Conversation Sidebar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 z-20 border-r border-border/35 flex flex-col bg-sidebar transition-all duration-300 overflow-hidden",
        sidebarOpen ? "w-[180px]" : "w-0 border-r-0 shadow-none"
      )}>
        {sidebarOpen && (
          <>
            {/* Header with close */}
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-wide text-muted-foreground/45">对话</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleOpenSearch}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/80 text-muted-foreground/35 hover:text-muted-foreground/70 transition-all duration-200"
                  title="搜索对话"
                >
                  <SearchIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/80 text-muted-foreground/35 hover:text-muted-foreground/70 transition-all duration-200"
                  title="收起"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* New conversation button */}
            <div className="px-2 pb-3">
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-2 px-3 py-2 rounded-md w-full border border-border/40 bg-card hover:bg-muted/60 transition-all duration-150 text-muted-foreground/70 hover:text-foreground/80"
              >
                <PlusIcon className="h-4 w-4 shrink-0" />
                <span className="text-[13px] font-medium">开启新对话</span>
              </button>
            </div>

            {/* Conversation history */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 pb-1.5">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/35">对话历史</span>
              </div>
              {conversations.length === 0 ? (
                <div className="px-3 py-4 text-[11px] text-muted-foreground/30 text-center">
                  暂无对话记录
                </div>
              ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-1.5 space-y-0.5">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); setConfirmDelete(null); setSearchOpen(false); setSearchQuery("") }}
                    className={cn(
                      "group flex items-center gap-2.5 px-2.5 py-2 rounded cursor-pointer transition-all duration-150",
                      activeId === conv.id
                        ? "bg-sidebar-accent"
                        : "hover:bg-sidebar-accent/60"
                    )}
                  >
                    <span className={cn(
                      "text-[13px] truncate flex-1 leading-5",
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
                        "h-6 w-6 flex items-center justify-center rounded-md transition-all duration-200 shrink-0",
                        confirmDelete === conv.id
                          ? "bg-red-50 text-red-500"
                          : "text-muted-foreground/20 hover:bg-muted/60 hover:text-muted-foreground/50"
                      )}
                    >
                      {confirmDelete === conv.id ? (
                        <Trash2Icon className="h-3.5 w-3.5" />
                      ) : (
                        <EllipsisIcon className="h-[15px] w-[15px]" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Overlay to close sidebar when clicking chat area */}
      {sidebarOpen && (
        <div className="absolute left-[180px] top-0 right-0 bottom-0 z-10" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-4 z-20 h-12 w-1.5 rounded-r-sm bg-border/50 hover:bg-primary/40 hover:w-2 transition-all duration-200"
            title="展开对话列表"
          />
        )}
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
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message}
                onRegenerate={() => {
                  if (!activeId || isTyping) return
                  setIsTyping(true)
                  const delay = 800 + Math.random() * 700
                  setTimeout(() => {
                    const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
                    setConversations((prev) =>
                      prev.map((c) => {
                        if (c.id !== activeId) return c
                        return { ...c, messages: c.messages.map((m) =>
                          m.id === message.id ? { ...m, content: response } : m
                        )}
                      })
                    )
                    setIsTyping(false)
                  }, delay)
                }}
                onEdit={(newContent) => {
                  setConversations((prev) =>
                    prev.map((c) => {
                      if (c.id !== activeId) return c
                      const idx = c.messages.findIndex((m) => m.id === message.id)
                      if (idx === -1) return c
                      const trimmed = c.messages.slice(0, idx + 1).map((m) =>
                        m.id === message.id ? { ...m, content: newContent } : m
                      )
                      return { ...c, messages: trimmed }
                    })
                  )
                  // Trigger regenerate
                  if (activeId && !isTyping) {
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
                  }
                }}
              />
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
            <div className="flex items-end gap-1.5 bg-card rounded-md border border-border/40 p-1.5 transition-all duration-200 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10">
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

      {/* Search modal */}
      {searchOpen && (
        <div className="absolute inset-0 z-30 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/15" onClick={handleCloseSearch} />
          <div className="relative w-[320px] max-h-[400px] bg-card rounded-md shadow-lg border border-border/40 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
              <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索对话内容..."
                className="flex-1 bg-transparent border-0 outline-none text-[13px] placeholder:text-muted-foreground/40"
              />
              <button
                onClick={handleCloseSearch}
                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground/40 hover:text-muted-foreground/70 transition-all duration-200 shrink-0"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
              {!searchQuery.trim() ? (
                <div className="py-8 text-center text-[12px] text-muted-foreground/40">
                  输入关键词搜索对话
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-muted-foreground/40">
                  未找到匹配的对话
                </div>
              ) : (
                searchResults.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); handleCloseSearch() }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left hover:bg-muted/60 transition-all duration-150"
                  >
                    <MessageSquareIcon className="h-4 w-4 shrink-0 text-muted-foreground/35" />
                    <span className="text-[13px] text-foreground/75 truncate">{conv.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
