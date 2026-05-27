"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { PlusIcon, SearchIcon, SparklesIcon, EllipsisIcon, Trash2Icon, ChevronLeftIcon, XIcon, MessageSquareIcon } from "lucide-react"
import { ChatMessage } from "./types"
import { ChatMessageBubble } from "./ChatMessage"
import { TypingIndicator } from "./TypingIndicator"
import { cn } from "@/lib/utils"
import { Sender } from "@ant-design/x"
import { RobotOutlined, ThunderboltOutlined, FileTextOutlined, HighlightOutlined, TranslationOutlined, UnorderedListOutlined, PaperClipOutlined } from "@ant-design/icons"
import { App, Button, Dropdown, Flex } from "antd"
import type { MenuProps } from "antd"

const XSwitch = Sender.Switch

interface ModelOption { label: string; desc: string; provider?: string; enableThinking?: boolean }

function buildModelOptions(providers: Array<{ name: string; models: string; enableThinking: boolean }>): Record<string, ModelOption> {
  const opts: Record<string, ModelOption> = {
    '': { label: '默认模型', desc: '使用默认供应商的第一个模型' },
  }
  for (const p of providers) {
    const modelList = p.models.split(",").map((m: string) => m.trim()).filter(Boolean)
    for (const model of modelList) {
      opts[model] = { label: model, desc: `${p.name} 供应商`, provider: p.name, enableThinking: p.enableThinking }
    }
  }
  return opts
}

const QUICK_ACTIONS = [
  { key: 'summarize', icon: <FileTextOutlined />, label: '总结视频', prompt: '请总结这个视频的主要内容' },
  { key: 'keypoints', icon: <HighlightOutlined />, label: '提取要点', prompt: '请提取视频中的关键要点' },
  { key: 'notes', icon: <UnorderedListOutlined />, label: '生成笔记', prompt: '请根据视频内容生成详细的学习笔记' },
  { key: 'translate', icon: <TranslationOutlined />, label: '翻译内容', prompt: '请将视频内容翻译成英文' },
]

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

function QAAssistantInner() {
  const { message } = App.useApp()
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
  const senderRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [modelOptions, setModelOptions] = useState<Record<string, ModelOption>>(buildModelOptions([]))
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files])
      message.success(`已选择 ${files.length} 个文件`)
      e.target.value = ''
    }
  }, [message])

  useEffect(() => {
    fetch('/api/llm-providers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setModelOptions(buildModelOptions(data))
        }
      })
      .catch(() => {})
  }, [])

  const modelItems: MenuProps['items'] = useMemo(
    () => Object.entries(modelOptions).map(([key, { label }]) => ({ key, icon: <RobotOutlined />, label })),
    [modelOptions],
  )

  const quickActionItems: MenuProps['items'] = useMemo(
    () => QUICK_ACTIONS.map((a) => ({ key: a.key, icon: a.icon, label: a.label })),
    [],
  )

  const handleQuickAction: MenuProps['onClick'] = useCallback((item: { key: string }) => {
    const action = QUICK_ACTIONS.find((a) => a.key === item.key)
    if (action) {
      setInputValue(action.prompt)
      setTimeout(() => senderRef.current?.focus?.(), 100)
    }
  }, [])

  const handleVoiceInput = useCallback((nextRecording: boolean) => {
    const SpeechRecognitionAPI: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      message.warning("当前浏览器不支持语音识别")
      setRecording(false)
      return
    }

    if (!nextRecording) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "zh-CN"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setRecording(true)
    }
    recognition.onend = () => {
      setRecording(false)
    }
    recognition.onerror = () => {
      setRecording(false)
      message.error("语音识别失败，请重试")
    }
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) {
        setInputValue((prev) => prev + transcript)
        senderRef.current?.focus?.()
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [message])

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

  const handleSend = useCallback((content?: string) => {
    const textToSend = content !== undefined ? content : inputValue
    const trimmed = textToSend.trim()
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

    message.success("Send message successfully!")

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
  }, [inputValue, isTyping, activeId, setActiveId, message])

  const handleNewConversation = () => {
    const conv = createConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setSidebarOpen(false)
    setSearchOpen(false)
    setSearchQuery("")
    setTimeout(() => senderRef.current?.focus?.(), 150)
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
        <div className="border-t border-border/20 p-3 shrink-0 bg-background/80 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <Flex gap={4} align="center" style={{ marginBottom: 8 }}>
              <Dropdown
                menu={{
                  selectedKeys: [selectedModel],
                  onClick: ({ key }) => setSelectedModel(key),
                  items: modelItems,
                }}
              >
                <XSwitch value={false} icon={<RobotOutlined />}>
                  {modelOptions[selectedModel]?.label || '模型'}
                </XSwitch>
              </Dropdown>
              <Dropdown
                menu={{
                  onClick: handleQuickAction,
                  items: quickActionItems,
                }}
              >
                <XSwitch value={false} icon={<ThunderboltOutlined />}>
                  快捷功能
                </XSwitch>
              </Dropdown>
            </Flex>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <Sender
              ref={senderRef}
              value={inputValue}
              onChange={(val) => setInputValue(val)}
              submitType="shiftEnter"
              placeholder="输入消息，Shift + Enter 发送"
              loading={isTyping}
              onSubmit={(val) => handleSend(val)}
              prefix={
                <Button
                  type="text"
                  icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                  onClick={() => fileInputRef.current?.click()}
                />
              }
              allowSpeech={{
                recording,
                onRecordingChange: (nextRecording) => {
                  setRecording(nextRecording)
                  handleVoiceInput(nextRecording)
                },
              }}
            />
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

export function QAAssistant() {
  return (
    <App className="h-full flex flex-col flex-1 min-h-0">
      <QAAssistantInner />
    </App>
  )
}
