"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Suspense } from "react"
import { Mic, Send, SparklesIcon, Settings, AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChatMessageBubble } from "@/components/video-detail/assistant/ChatMessage"
import { TypingIndicator } from "@/components/video-detail/assistant/TypingIndicator"
import type { ToolEvent } from "@/components/chat/tool-panel"
import type { ChatMessage } from "@/components/video-detail/assistant/types"
import { cn } from "@/lib/utils"

const WELCOME_QUESTIONS = [
  "帮我找 React Server Components 的视频",
  "最近有什么好的 AI Agent 学习资源？",
  "我视频库里有没有讲过 Fiber 调度？",
]

const STORAGE_KEY = "video-shancn-chats"

interface StoredMessage {
  id: string
  role: "user" | "agent"
  content: string
  createdAt: string
}

interface StoredConversation {
  id: string
  title: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

function parseSSELine(line: string): { event?: string; data?: string } {
  if (line.startsWith("event: ")) return { event: line.slice(7) }
  if (line.startsWith("data: ")) return { data: line.slice(6) }
  return {}
}

function toStoredMessages(msgs: ChatMessage[]): StoredMessage[] {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role === "user" ? "user" : "agent",
    content: m.content,
    createdAt: m.timestamp.toISOString(),
  }))
}

function fromStoredMessages(stored: StoredMessage[]): ChatMessage[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    timestamp: new Date(m.createdAt),
  }))
}

function genId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function saveConversations(convs: StoredConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs))
  } catch {}
}

function loadConversations(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function AIAssistantPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [notConfigured, setNotConfigured] = useState(false)
  const [assistantName, setAssistantName] = useState("AI 智能助手")
  const [assistantAvatar, setAssistantAvatar] = useState("")
  const [convId, setConvId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load assistant settings
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

  // Load conversation from URL param
  useEffect(() => {
    const id = searchParams.get("id")
    if (!id || convId) return
    const convs = loadConversations()
    const found = convs.find((c) => c.id === id)
    if (found) {
      setConvId(found.id)
      setMessages(fromStoredMessages(found.messages))
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save conversation after state changes (debounced by streaming completion)
  useEffect(() => {
    if (!convId || messages.length === 0) return
    const convs = loadConversations()
    const idx = convs.findIndex((c) => c.id === convId)
    const title = messages.find((m) => m.role === "user")?.content.slice(0, 40) || "新对话"
    const entry: StoredConversation = {
      id: convId,
      title,
      messages: toStoredMessages(messages),
      createdAt: convs[idx]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (idx >= 0) convs[idx] = entry
    else convs.unshift(entry)
    saveConversations(convs)
  }, [messages, convId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isStreaming) return

    // Create new conversation ID on first message
    const cid = convId || genId()
    if (!convId) {
      setConvId(cid)
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsStreaming(true)
    setNotConfigured(false)
    setToolEvents([])

    const assistantId = `assistant-${Date.now()}`
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, placeholder])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }))
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `错误: ${err.error || "未知错误"}` } : m
          )
        )
        setIsStreaming(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let currentEvent = ""
        for (const line of lines) {
          const parsed = parseSSELine(line)
          if (parsed.event) {
            currentEvent = parsed.event
          } else if (parsed.data) {
            try {
              const data = JSON.parse(parsed.data)

              if (currentEvent === "token") {
                fullContent += data.content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                )
              } else if (currentEvent === "tool_start") {
                setToolEvents((prev) => [
                  ...prev,
                  {
                    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: data.name,
                    args: data.args || {},
                    status: "running",
                  },
                ])
              } else if (currentEvent === "tool_end") {
                setToolEvents((prev) =>
                  prev.map((t) =>
                    t.name === data.name && t.status === "running"
                      ? { ...t, status: "done", result: data.result as string }
                      : t
                  )
                )
              } else if (currentEvent === "error") {
                if (data.code === "NOT_CONFIGURED") {
                  setNotConfigured(true)
                  setMessages((prev) => prev.filter((m) => m.id !== assistantId))
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: `抱歉，${data.message}` }
                        : m
                    )
                  )
                }
              }
            } catch {}
            currentEvent = ""
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "网络错误，请稍后重试" } : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }, [inputValue, isStreaming, messages, convId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  const handleImport = useCallback((urls: string[]) => {
    if (urls.length === 0 || isStreaming) return
    const lines = urls.map((u) => `- ${u}`).join("\n")
    setInputValue(`请帮我导入以下视频：\n${lines}`)
  }, [isStreaming])

  return (
    <div className="flex flex-col h-[calc(100vh-2.75rem)] bg-background">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            {notConfigured ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-3">
                <div className="flex justify-center">
                  <div className="size-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-foreground/85">AI 模型未配置</h3>
                <p className="text-[13px] text-muted-foreground/70 leading-relaxed">
                  请先配置 LLM API Key（支持 MiniMax 或 DeepSeek），我才能帮你搜索和分析视频。
                </p>
                <button
                  onClick={() => router.push("?settings=llm")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  前往配置
                </button>
              </div>
            ) : (
              <>
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
                  你的个人 AI 学习伙伴，随时搜索视频、分析内容、解答问题
                </p>
                <div className="flex flex-col gap-2">
                  {WELCOME_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className="text-[13px] px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/90 transition-all duration-200 text-muted-foreground/70 hover:text-foreground/80 text-left"
                      onClick={() => setInputValue(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {messages.map((message, idx) => (
            <div key={message.id}>
              <ChatMessageBubble
                message={message}
                onRegenerate={() => {}}
                onEdit={() => {}}
                onImport={handleImport}
                toolEvents={
                  message.role === "assistant" && idx === messages.length - 1
                    ? toolEvents
                    : undefined
                }
              />
            </div>
          ))}
          {isStreaming && !messages[messages.length - 1]?.content && (
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

      <div className="border-t border-border/20 p-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-1.5 bg-card rounded-md border border-border/40 p-1.5 transition-all duration-200 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10">
            <button
              type="button"
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-primary/70 hover:bg-primary/[0.06] transition-all duration-200"
              onClick={isStreaming ? handleStop : undefined}
            >
              {isStreaming ? (
                <div className="size-3 rounded-sm bg-red-400/80" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                notConfigured
                  ? "请先配置 AI 模型..."
                  : "输入你的问题，例如：帮我找 AI Agent 的视频"
              }
              className={cn(
                "flex-1 min-h-[36px] max-h-[66px] py-[7px] px-0 resize-none bg-transparent border-0 outline-none ring-0",
                "focus-visible:ring-0 focus-visible:ring-offset-0 text-[13px] placeholder:text-muted-foreground/40",
                "leading-[22px] field-sizing-content rounded-none",
                "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              )}
              rows={1}
              disabled={isStreaming}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
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
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-2.75rem)] bg-background items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground/40">
            <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" />
            <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.15s" }} />
            <div className="size-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      }
    >
      <AIAssistantPageContent />
    </Suspense>
  )
}
