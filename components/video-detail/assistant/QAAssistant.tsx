"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { PlusIcon, SearchIcon, EllipsisIcon, Trash2Icon, ChevronLeftIcon, XIcon, MessageSquareIcon, BookOpenIcon, TargetIcon, FileTextIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sender, Bubble, Think, Actions } from "@ant-design/x"
import { useXChat, XRequest } from "@ant-design/x-sdk"
import XMarkdown from "@ant-design/x-markdown"
import { StudyAgentChatProvider } from "@/lib/chat-provider"
import type { ChatMessage, ChatInput } from "@/lib/chat-provider"
import { RobotOutlined, ThunderboltOutlined, FileTextOutlined, HighlightOutlined, TranslationOutlined, UnorderedListOutlined, PaperClipOutlined, RedoOutlined, EditOutlined } from "@ant-design/icons"
import { App, Button, Dropdown, Flex, Input, Pagination } from "antd"
import type { MenuProps } from "antd"

interface ModelOption { label: string; desc: string; provider?: string; enableThinking?: boolean }

function buildModelOptions(providers: Array<{ id: string; name: string; models: string; enableThinking: boolean }>): Record<string, ModelOption> {
  const opts: Record<string, ModelOption> = {
    '': { label: '默认模型', desc: '使用默认供应商的第一个模型' },
  }
  for (const p of providers) {
    const modelList = p.models.split(",").map((m: string) => m.trim()).filter(Boolean)
    
    let enabledMap: Record<string, boolean> = {}
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`llm_enabled_models_${p.id}`)
      if (saved) {
        try {
          enabledMap = JSON.parse(saved)
        } catch {}
      }
    }

    for (const model of modelList) {
      if (enabledMap[model] === false) {
        continue
      }
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

const SUGGESTED_QUESTIONS = [
  "视频的主题是什么？",
  "有哪些关键要点？",
  "总结一下主要内容",
]

interface ConversationMeta {
  id: string
  title: string
  createdAt: number
}

function QAAssistantInner() {
  const { message } = App.useApp()

  const providerRef = useRef<StudyAgentChatProvider | null>(null)
  if (!providerRef.current) {
    providerRef.current = new StudyAgentChatProvider({
      request: XRequest<ChatInput>('/api/chat', { manual: true }),
    })
  }

  const [conversations, setConversations] = useState<ConversationMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const senderRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bubbleListRef = useRef<HTMLDivElement>(null)
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [modelOptions, setModelOptions] = useState<Record<string, ModelOption>>(buildModelOptions([]))
  const [providers, setProviders] = useState<any[]>([])
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const generatingMsgIdRef = useRef<string | number | null>(null)

  const isThinkingEnabled = useMemo(() => {
    if (selectedModel) {
      return modelOptions[selectedModel]?.enableThinking !== false
    }
    const defaultProvider = providers.find(p => p.isDefault) || providers[0]
    return defaultProvider ? defaultProvider.enableThinking !== false : true
  }, [selectedModel, modelOptions, providers])

  const { messages, onRequest, isRequesting, abort, onReload, setMessage, setMessages } = useXChat<ChatMessage, ChatMessage, ChatInput>({
    provider: providerRef.current,
    requestPlaceholder: { content: '正在思考中...', role: 'assistant' },
    requestFallback: (_, { error }) => {
      if (error?.name === 'AbortError') {
        return { content: '已取消回复', role: 'assistant' }
      }
      return { content: '请求失败，请稍后重试', role: 'assistant' }
    },
  })

  const getHistory = useCallback((limitIndex?: number) => {
    const list = limitIndex !== undefined ? messages.slice(0, limitIndex) : messages
    return list.map((m, idx) => {
      let displayedContent = m.message.content
      if (m.message.role === 'user') {
        const versions = m.extraInfo?.versions || []
        const activeIndex = m.extraInfo?.activeVersionIndex !== undefined
          ? m.extraInfo.activeVersionIndex
          : (versions.length > 0 ? versions.length - 1 : 0)
        displayedContent = versions.length > 0
          ? versions[activeIndex]?.content || m.message.content
          : m.message.content
      } else {
        let userMsg = null
        for (let i = idx - 1; i >= 0; i--) {
          if (messages[i].message.role === 'user') {
            userMsg = messages[i]
            break
          }
        }
        if (userMsg && userMsg.extraInfo?.versions) {
          const userVersions = userMsg.extraInfo.versions
          const userActiveIndex = userMsg.extraInfo.activeVersionIndex ?? 0
          const activeVariant = userVersions[userActiveIndex]
          if (activeVariant) {
            const responses = activeVariant.responses || []
            const activeIndex = activeVariant.activeResponseIndex ?? 0
            displayedContent = responses.length > 0
              ? responses[activeIndex] || m.message.content
              : m.message.content
          }
        }
      }
      return { role: m.message.role, content: displayedContent }
    })
  }, [messages])

  const handleSwitchVersion = useCallback((userMsgId: string | number | null, isAssistantSwitch: boolean, targetIndex: number) => {
    if (!userMsgId) return
    const userMsg = messages.find(m => m.id === userMsgId)
    if (!userMsg) return

    if (!isAssistantSwitch) {
      const versions = userMsg.extraInfo?.versions ? [...userMsg.extraInfo.versions] : []
      const selectedVersion = versions[targetIndex]
      const msgIndex = messages.findIndex((m) => m.id === userMsgId)
      let assistantMsg = null
      if (msgIndex !== -1) {
        for (let i = msgIndex + 1; i < messages.length; i++) {
          if (messages[i].message.role === 'assistant') {
            assistantMsg = messages[i]
            break
          }
        }
      }
      if (assistantMsg) {
        const assistantIndex = messages.findIndex((m) => m.id === assistantMsg.id)
        if (assistantIndex !== -1) {
          const currentActiveIdx = userMsg.extraInfo?.activeVersionIndex ?? 0
          const currentSubsequentMsgs = messages.slice(assistantIndex + 1)
          if (versions[currentActiveIdx]) {
            versions[currentActiveIdx] = { ...versions[currentActiveIdx], subsequentMessages: currentSubsequentMsgs }
          }
          const restoredFollowUpMsgs = selectedVersion?.subsequentMessages || []
          let prefixMessages = messages.slice(0, assistantIndex + 1)
          prefixMessages = prefixMessages.map((m) => {
            if (m.id === userMsgId) {
              return {
                ...m,
                message: { ...m.message, content: selectedVersion?.content || m.message.content },
                extraInfo: { ...m.extraInfo, versions, activeVersionIndex: targetIndex },
              }
            }
            if (m.id === assistantMsg.id && selectedVersion) {
              const responses = selectedVersion.responses || []
              const activeResponseIdx = selectedVersion.activeResponseIndex ?? 0
              return { ...m, message: { ...m.message, content: responses[activeResponseIdx] || m.message.content } }
            }
            return m
          })
          setMessages([...prefixMessages, ...restoredFollowUpMsgs])
        }
      }
    } else {
      const versions = userMsg.extraInfo?.versions ? [...userMsg.extraInfo.versions] : []
      const activeIndex = userMsg.extraInfo?.activeVersionIndex ?? 0
      if (versions[activeIndex]) {
        versions[activeIndex] = { ...versions[activeIndex], activeResponseIndex: targetIndex }
        const msgIndex = messages.findIndex((m) => m.id === userMsgId)
        let assistantMsg = null
        if (msgIndex !== -1) {
          for (let i = msgIndex + 1; i < messages.length; i++) {
            if (messages[i].message.role === 'assistant') {
              assistantMsg = messages[i]
              break
            }
          }
        }
        const responses = versions[activeIndex].responses || []
        const selectedResponse = responses[targetIndex]
        if (assistantMsg && selectedResponse !== undefined) {
          const assistantIndex = messages.findIndex((m) => m.id === assistantMsg.id)
          if (assistantIndex !== -1) {
            const currentSubsequentMsgs = messages.slice(assistantIndex + 1)
            let updatedMessages = messages.slice(0, assistantIndex + 1)
            updatedMessages = updatedMessages.map((m) => {
              if (m.id === userMsgId) return { ...m, extraInfo: { ...m.extraInfo, versions } }
              if (m.id === assistantMsg.id) return { ...m, message: { ...m.message, content: selectedResponse } }
              return m
            })
            setMessages([...updatedMessages, ...currentSubsequentMsgs])
          }
        }
      }
    }
  }, [messages, setMessages])

  const handleSaveEdit = useCallback((id: string | number) => {
    if (!editingContent.trim()) {
      message.warning('问题内容不能为空')
      return
    }
    const userMsg = messages.find((m) => m.id === id)
    if (!userMsg) return

    const msgIndex = messages.findIndex((m) => m.id === id)
    let assistantMsg = null
    if (msgIndex !== -1) {
      for (let i = msgIndex + 1; i < messages.length; i++) {
        if (messages[i].message.role === 'assistant') {
          assistantMsg = messages[i]
          break
        }
      }
    }

    let subsequentMessages: any[] = []
    if (assistantMsg) {
      const assistantIndex = messages.findIndex((m) => m.id === assistantMsg.id)
      if (assistantIndex !== -1) {
        subsequentMessages = messages.slice(assistantIndex + 1)
      }
    }

    const existingVersions = userMsg.extraInfo?.versions || []
    const originalContent = userMsg.message.content
    let versions = [...existingVersions]
    const currentActiveIndex = userMsg.extraInfo?.activeVersionIndex ?? 0
    if (versions.length === 0) {
      versions = [{
        content: originalContent,
        responses: assistantMsg ? [assistantMsg.message.content] : [],
        activeResponseIndex: 0,
        subsequentMessages,
      }]
    } else if (versions[currentActiveIndex]) {
      versions[currentActiveIndex] = { ...versions[currentActiveIndex], subsequentMessages }
    }

    const newVariant = { content: editingContent, responses: [], activeResponseIndex: 0, subsequentMessages: [] }
    versions.push(newVariant)
    const newIndex = versions.length - 1

    setMessage(id, {
      message: { role: 'user', content: editingContent },
      extraInfo: { ...userMsg.extraInfo, versions, activeVersionIndex: newIndex },
    })

    if (assistantMsg) {
      const assistantIndex = messages.findIndex((m) => m.id === assistantMsg.id)
      if (assistantIndex !== -1) {
        setMessages(messages.slice(0, assistantIndex + 1))
      }
      setMessage(assistantMsg.id, {
        message: { role: 'assistant', content: '', thinking: '' },
        status: 'loading',
      })
      const history = getHistory(msgIndex)
      onReload(assistantMsg.id, {
        messages: [...history, { role: 'user', content: editingContent }],
        model: selectedModel || undefined,
        provider: selectedModel ? modelOptions[selectedModel]?.provider : undefined,
      })
    }
    setEditingId(null)
  }, [editingContent, messages, setMessage, setMessages, onReload, selectedModel, modelOptions, getHistory, message])

  useEffect(() => {
    messages.forEach(({ id, message: msg, status }) => {
      if (msg.role === 'assistant' && (status === 'loading' || status === 'updating')) {
        generatingMsgIdRef.current = id
      }
    })
  }, [messages])

  useEffect(() => {
    messages.forEach(({ id, message: msg, status }) => {
      if (msg.role === 'assistant' && status === 'success' && generatingMsgIdRef.current === id) {
        const msgIndex = messages.findIndex((m) => m.id === id)
        if (msgIndex !== -1) {
          let userMsg = null
          for (let i = msgIndex - 1; i >= 0; i--) {
            if (messages[i].message.role === 'user') {
              userMsg = messages[i]
              break
            }
          }
          if (userMsg) {
            const existingVersions = userMsg.extraInfo?.versions || []
            const userActiveIndex = userMsg.extraInfo?.activeVersionIndex ?? 0
            const currentContent = msg.content
            let versions = [...existingVersions]
            if (versions.length === 0) {
              versions = [{ content: userMsg.message.content, responses: [currentContent], activeResponseIndex: 0 }]
            } else {
              const activeVariant = { ...versions[userActiveIndex] }
              const responses = activeVariant.responses ? [...activeVariant.responses] : []
              if (responses.length === 0 || responses[responses.length - 1] !== currentContent) {
                responses.push(currentContent)
                activeVariant.responses = responses
                activeVariant.activeResponseIndex = responses.length - 1
                versions[userActiveIndex] = activeVariant
              }
            }
            setMessage(userMsg.id, {
              extraInfo: { ...userMsg.extraInfo, versions, activeVersionIndex: userActiveIndex },
            })
          }
        }
        generatingMsgIdRef.current = null
      }
    })
  }, [messages, setMessage])

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
          setProviders(data)
          setModelOptions(buildModelOptions(data))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (bubbleListRef.current) {
      bubbleListRef.current.scrollTop = bubbleListRef.current.scrollHeight
    }
  }, [messages])

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
    recognition.onstart = () => setRecording(true)
    recognition.onend = () => setRecording(false)
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

  const handleSubmit = useCallback((content?: string) => {
    const textToSend = content !== undefined ? content : inputValue
    const trimmed = textToSend.trim()
    if (!trimmed || isRequesting) return
    const history = getHistory()
    onRequest({
      messages: [...history, { role: 'user', content: trimmed }],
      model: selectedModel || undefined,
      provider: selectedModel ? modelOptions[selectedModel]?.provider : undefined,
    })
    setInputValue("")
    if (!activeId) {
      const newId = `conv-${Date.now()}`
      setConversations(prev => [{ id: newId, title: trimmed.slice(0, 20) + (trimmed.length > 20 ? "…" : ""), createdAt: Date.now() }, ...prev])
      setActiveId(newId)
    }
  }, [inputValue, isRequesting, getHistory, onRequest, selectedModel, modelOptions, activeId])

  const handleNewConversation = () => {
    const newId = `conv-${Date.now()}`
    setConversations(prev => [{ id: newId, title: "新对话", createdAt: Date.now() }, ...prev])
    setActiveId(newId)
    setSidebarOpen(false)
    setSearchOpen(false)
    setSearchQuery("")
    setTimeout(() => senderRef.current?.focus?.(), 150)
  }

  const handleDeleteConversation = (id: string) => {
    if (confirmDelete === id) {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (id === activeId && filtered.length > 0) setActiveId(filtered[0].id)
        if (filtered.length === 0) setActiveId(null)
        return filtered
      })
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

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
      if (e.key === "Escape" && searchOpen) handleCloseSearch()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen, handleOpenSearch, handleCloseSearch])

  const hasMessages = messages.length > 0

  return (
    <div className="flex h-full min-h-0 relative overflow-hidden">
      {/* Conversation Sidebar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 z-20 border-r border-border/35 flex flex-col bg-sidebar transition-all duration-300 overflow-hidden",
        sidebarOpen ? "w-[180px]" : "w-0 border-r-0 shadow-none"
      )}>
        {sidebarOpen && (
          <>
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-wide text-muted-foreground/45">对话</span>
              <div className="flex items-center gap-1">
                <button onClick={handleOpenSearch} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/80 text-muted-foreground/35 hover:text-muted-foreground/70 transition-all duration-200" title="搜索对话">
                  <SearchIcon className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setSidebarOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/80 text-muted-foreground/35 hover:text-muted-foreground/70 transition-all duration-200" title="收起">
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="px-2 pb-3">
              <button onClick={handleNewConversation} className="flex items-center gap-2 px-3 py-2 rounded-md w-full border border-border/40 bg-card hover:bg-muted/60 transition-all duration-150 text-muted-foreground/70 hover:text-foreground/80">
                <PlusIcon className="h-4 w-4 shrink-0" />
                <span className="text-[13px] font-medium">开启新对话</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 pb-1.5">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/35">对话历史</span>
              </div>
              {conversations.length === 0 ? (
                <div className="px-3 py-4 text-[11px] text-muted-foreground/30 text-center">暂无对话记录</div>
              ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-1.5 space-y-0.5">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); setConfirmDelete(null); setSearchOpen(false); setSearchQuery("") }}
                    className={cn("group flex items-center gap-2.5 px-2.5 py-2 rounded cursor-pointer transition-all duration-150", activeId === conv.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60")}
                  >
                    <span className={cn("text-[13px] truncate flex-1 leading-5", activeId === conv.id ? "text-foreground/80 font-medium" : "text-muted-foreground/55")}>{conv.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id) }}
                      className={cn("h-6 w-6 flex items-center justify-center rounded-md transition-all duration-200 shrink-0", confirmDelete === conv.id ? "bg-red-50 text-red-500" : "text-muted-foreground/20 hover:bg-muted/60 hover:text-muted-foreground/50")}
                    >
                      {confirmDelete === conv.id ? <Trash2Icon className="h-3.5 w-3.5" /> : <EllipsisIcon className="h-[15px] w-[15px]" />}
                    </button>
                  </div>
                ))}
              </div>
              )}
            </div>
          </>
        )}
      </div>

      {sidebarOpen && (
        <div className="absolute left-[180px] top-0 right-0 bottom-0 z-10" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="absolute left-0 top-4 z-20 h-12 w-1.5 rounded-r-sm bg-border/50 hover:bg-primary/40 hover:w-2 transition-all duration-200" title="展开对话列表" />
        )}
        {!hasMessages ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-sm w-full text-center">
              <div className="size-14 rounded-full overflow-hidden shrink-0 mx-auto mb-6">
                <img alt="logo" className="size-full object-cover" src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground/85">视频问答助手</h3>
              <p className="text-[13px] text-muted-foreground/60 mb-6 leading-relaxed">基于视频内容智能分析，随时为你答疑解惑</p>
              <div className="flex flex-col gap-2.5">
                {SUGGESTED_QUESTIONS.map((q, idx) => {
                  const icons = [<BookOpenIcon className="h-4 w-4" />, <TargetIcon className="h-4 w-4" />, <FileTextIcon className="h-4 w-4" />]
                  return (
                    <button
                      key={q}
                      className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200 text-left"
                      onClick={() => handleSubmit(q)}
                    >
                      <span className="shrink-0 flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary/70 group-hover:bg-primary/15 group-hover:text-primary transition-colors">{icons[idx]}</span>
                      <span className="flex-1 text-[13px] text-muted-foreground/80 group-hover:text-foreground/90 transition-colors">{q}</span>
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div ref={bubbleListRef} className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
            <Bubble.List
              role={{
                assistant: {
                  placement: 'start',
                  contentRender: (msg: ChatMessage & { status?: string }) => (
                    <div className="max-w-[85%]">
                      {msg.thinking && isThinkingEnabled && (
                        <Think title="思考过程" defaultExpanded={false} className="mb-3">
                          <div className="text-xs text-muted-foreground/70 whitespace-pre-wrap font-sans">{msg.thinking}</div>
                        </Think>
                      )}
                      <div className="markdown-content w-full overflow-x-auto">
                        <XMarkdown
                          openLinksInNewTab
                          paragraphTag="div"
                          streaming={{
                            hasNextChunk: msg.status === 'updating' || msg.status === 'loading',
                            enableAnimation: true,
                            tail: msg.status === 'updating' || msg.status === 'loading' ? { content: '▋' } : false,
                          }}
                          components={{
                            think: ({ children }: any) => {
                              if (!isThinkingEnabled) return null
                              return (
                                <Think title="思考过程" defaultExpanded={false} className="mb-3">
                                  <div className="text-xs text-muted-foreground/70 whitespace-pre-wrap font-sans">{children}</div>
                                </Think>
                              )
                            },
                          }}
                        >
                          {msg.content}
                        </XMarkdown>
                      </div>
                    </div>
                  ),
                },
                user: {
                  placement: 'end',
                  styles: { content: { backgroundColor: '#e6f4ff', borderRadius: 16 } },
                  contentRender: (msg: { id: string | number; content: string }) => {
                    if (editingId === msg.id) {
                      return (
                        <div className="flex flex-col gap-2 min-w-[200px] md:min-w-[300px]">
                          <Input.TextArea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            autoSize={{ minRows: 2, maxRows: 6 }}
                            className="w-full"
                          />
                          <Flex gap="small" justify="end">
                            <Button size="small" onClick={() => setEditingId(null)}>取消</Button>
                            <Button size="small" type="primary" onClick={() => handleSaveEdit(msg.id)}>确认</Button>
                          </Flex>
                        </div>
                      )
                    }
                    return <div className="whitespace-pre-wrap">{msg.content}</div>
                  },
                },
              }}
              items={messages.map(({ id, message: msg, status, extraInfo }) => {
                let displayedContent = msg.content
                let versions: any[] = []
                let activeIndex = 0
                const isUser = msg.role === 'user'

                if (isUser) {
                  versions = extraInfo?.versions || []
                  activeIndex = extraInfo?.activeVersionIndex !== undefined
                    ? extraInfo.activeVersionIndex
                    : (versions.length > 0 ? versions.length - 1 : 0)
                  displayedContent = versions.length > 0
                    ? versions[activeIndex]?.content || msg.content
                    : msg.content
                } else {
                  const msgIndex = messages.findIndex((m) => m.id === id)
                  let userMsg = null
                  if (msgIndex !== -1) {
                    for (let i = msgIndex - 1; i >= 0; i--) {
                      if (messages[i].message.role === 'user') {
                        userMsg = messages[i]
                        break
                      }
                    }
                  }
                  if (userMsg && userMsg.extraInfo?.versions) {
                    const userVersions = userMsg.extraInfo.versions
                    const userActiveIndex = userMsg.extraInfo.activeVersionIndex ?? 0
                    const activeVariant = userVersions[userActiveIndex]
                    if (activeVariant) {
                      versions = activeVariant.responses || []
                      activeIndex = activeVariant.activeResponseIndex ?? 0
                      displayedContent = versions.length > 0 ? versions[activeIndex] || msg.content : msg.content
                    }
                  }
                }

                return {
                  key: id,
                  role: msg.role as 'user' | 'assistant',
                  content: msg.role === 'assistant' ? { ...msg, content: displayedContent, status } as any : { id, content: displayedContent },
                  loading: status === 'loading',
                  footer: msg.role === 'assistant' && status !== 'loading' && status !== 'updating' ? (
                    <Actions
                      items={[
                        ...(versions.length > 1 ? [{
                          key: 'pagination',
                          actionRender: () => (
                            <Pagination
                              simple
                              size="small"
                              current={activeIndex + 1}
                              total={versions.length}
                              pageSize={1}
                              onChange={(page) => {
                                const mi = messages.findIndex((m) => m.id === id)
                                let um = null
                                if (mi !== -1) {
                                  for (let i = mi - 1; i >= 0; i--) {
                                    if (messages[i].message.role === 'user') { um = messages[i]; break }
                                  }
                                }
                                if (um) handleSwitchVersion(um.id, true, page - 1)
                              }}
                            />
                          ),
                        }] : []),
                        { key: 'copy', actionRender: () => <Actions.Copy text={displayedContent} /> },
                        { key: 'retry', icon: <RedoOutlined />, label: '重新生成' },
                      ]}
                      onClick={({ key }) => {
                        if (key === 'retry') {
                          const mi = messages.findIndex((m) => m.id === id)
                          let um = null
                          for (let i = mi - 1; i >= 0; i--) {
                            if (messages[i].message.role === 'user') { um = messages[i]; break }
                          }
                          setMessage(id, { message: { ...msg, content: '', thinking: '' }, status: 'loading' })
                          const userMsgIndex = um ? messages.findIndex((m) => m.id === um.id) : -1
                          const history = userMsgIndex !== -1 ? getHistory(userMsgIndex) : []
                          onReload(id, {
                            messages: um ? [...history, { role: um.message.role, content: um.message.content }] : [],
                            model: selectedModel || undefined,
                            provider: selectedModel ? modelOptions[selectedModel]?.provider : undefined,
                          })
                        }
                      }}
                      variant="borderless"
                    />
                  ) : (msg.role === 'user' && editingId !== id ? (
                    <Actions
                      items={[
                        ...(versions.length > 1 ? [{
                          key: 'pagination',
                          actionRender: () => (
                            <Pagination
                              simple
                              size="small"
                              current={activeIndex + 1}
                              total={versions.length}
                              pageSize={1}
                              onChange={(page) => handleSwitchVersion(id, false, page - 1)}
                            />
                          ),
                        }] : []),
                        { key: 'edit', icon: <EditOutlined />, label: '编辑' },
                      ]}
                      onClick={({ key }) => {
                        if (key === 'edit') {
                          setEditingId(id)
                          setEditingContent(displayedContent)
                        }
                      }}
                      variant="borderless"
                    />
                  ) : undefined),
                }
              })}
            />
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-border/20 p-3 shrink-0 bg-background/80 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <Flex gap={8} align="center" style={{ marginBottom: 8 }}>
              <Dropdown
                menu={{ selectedKeys: [selectedModel], onClick: ({ key }) => setSelectedModel(key), items: modelItems }}
              >
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 text-[12px] text-muted-foreground/70 hover:text-foreground/80">
                  <RobotOutlined className="text-[14px]" />
                  <span>{modelOptions[selectedModel]?.label || '默认模型'}</span>
                  <ChevronDownIcon className="h-3 w-3 opacity-50" />
                </button>
              </Dropdown>
              <Dropdown menu={{ onClick: handleQuickAction, items: quickActionItems }}>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 text-[12px] text-muted-foreground/70 hover:text-foreground/80">
                  <ThunderboltOutlined className="text-[14px]" />
                  <span>快捷功能</span>
                  <ChevronDownIcon className="h-3 w-3 opacity-50" />
                </button>
              </Dropdown>
            </Flex>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
            <Sender
              ref={senderRef}
              value={inputValue}
              onChange={(val) => setInputValue(val)}
              submitType="shiftEnter"
              placeholder="输入消息，Shift + Enter 发送"
              loading={isRequesting}
              onSubmit={(val) => handleSubmit(val)}
              onCancel={() => { abort(); message.error('已取消发送') }}
              prefix={
                <Button type="text" icon={<PaperClipOutlined style={{ fontSize: 18 }} />} onClick={() => fileInputRef.current?.click()} />
              }
              allowSpeech={{
                recording,
                onRecordingChange: (nextRecording) => { setRecording(nextRecording); handleVoiceInput(nextRecording) },
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
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索对话内容..." className="flex-1 bg-transparent border-0 outline-none text-[13px] placeholder:text-muted-foreground/40" />
              <button onClick={handleCloseSearch} className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground/40 hover:text-muted-foreground/70 transition-all duration-200 shrink-0">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
              {!searchQuery.trim() ? (
                <div className="py-8 text-center text-[12px] text-muted-foreground/40">输入关键词搜索对话</div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-muted-foreground/40">未找到匹配的对话</div>
              ) : (
                searchResults.map((conv) => (
                  <button key={conv.id} onClick={() => { setActiveId(conv.id); handleCloseSearch() }} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left hover:bg-muted/60 transition-all duration-150">
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
