'use client'

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bubble, Sender, SenderProps, Think, CodeHighlighter, Mermaid, Actions } from '@ant-design/x'
import { useXChat, XRequest } from '@ant-design/x-sdk'
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown'
import { ShancnChatProvider } from '@/lib/chat-provider'
import type { ChatMessage, ChatInput } from '@/lib/chat-provider'
import {
  AntDesignOutlined,
  AudioFilled,
  AudioOutlined,
  EditOutlined,
  ImportOutlined,
  PaperClipOutlined,
  RedoOutlined,
  RobotOutlined,
  YoutubeOutlined,
} from '@ant-design/icons'
import type { GetRef, MenuProps } from 'antd'
import { Button, Divider, Dropdown, Flex, Input, message, Pagination } from 'antd'
import { getProviderAvatar } from '@/components/llm/provider-icons'
import { Input as SearchInput } from '@/components/ui/input'

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  [index: number]: { transcript: string; confidence: number }
  isFinal: boolean
  length: number
}

declare var SpeechRecognition: {
  new (): SpeechRecognition
}

interface Window {
  SpeechRecognition?: typeof SpeechRecognition
  webkitSpeechRecognition?: typeof SpeechRecognition
}

const XSwitch = Sender.Switch

const iconStyle = { fontSize: 16 }

interface ModelOption { label: string; desc: string; provider?: string; enableThinking?: boolean; logo?: string | null }

function buildModelOptions(providers: Array<{ id: string; name: string; models: string; enableThinking: boolean; logo?: string | null; enabled?: boolean }>): Record<string, ModelOption> {
  const opts: Record<string, ModelOption> = {}
  for (const p of providers) {
    if (p.enabled === false) {
      continue
    }
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
      opts[model] = {
        label: `${model}`,
        desc: `${p.name} 供应商`,
        provider: p.name,
        enableThinking: p.enableThinking,
        logo: p.logo,
      }
    }
  }
  return opts
}

const AgentInfo: Record<
  string,
  {
    icon: React.ReactNode
    label: string
    skill: SenderProps['skill']
    slotConfig: SenderProps['slotConfig']
  }
> = {
  search_videos: {
    icon: <YoutubeOutlined />,
    label: '搜索视频',
    skill: { value: 'searchVideos', title: '搜索视频', closable: true },
    slotConfig: [
      { type: 'text', value: '帮我在' },
      {
        type: 'select',
        key: 'platform',
        props: { options: ['B站', 'YouTube', 'B站和YouTube'], placeholder: '选择平台' },
      },
      { type: 'text', value: '搜索关于' },
      {
        type: 'content',
        key: 'keyword',
        props: { placeholder: '[输入关键词]' },
      },
      { type: 'text', value: '的学习视频。' },
    ],
  },
  import_video: {
    icon: <ImportOutlined />,
    label: '导入视频',
    skill: { value: 'importVideo', title: '导入视频', closable: true },
    slotConfig: [
      { type: 'text', value: '请帮我导入这个视频链接：' },
      {
        type: 'content',
        key: 'url',
        props: { placeholder: '[粘贴B站或YouTube链接]' },
      },
    ],
  },
}

const sanitizeMermaid = (code: string) => {
  if (!code) return code;
  
  return code.split('\n').map(line => {
    const parts = line.split(/(\s*-[.-]*>\s*|\s*={2,}>\s*|\s*-{3,}\s*)/g);
    
    const sanitizedParts = parts.map(part => {
      if (/^\s*[-=]+[.-]*>\s*$/.test(part) || /^\s*-{3,}\s*$/.test(part)) {
        return part;
      }
      
      return part.replace(
        /\b([A-Za-z0-9_-]+)\s*(\[|\(|\{)\s*([^"'\r\n]+)\s*(\]|\)|\})/g,
        (match, id, open, text, close) => {
          if (text.trim().startsWith('"') && text.trim().endsWith('"')) {
            return match;
          }
          const sanitizedText = text.replace(/"/g, '\\"');
          return `${id}${open}"${sanitizedText}"${close}`;
        }
      );
    });
    
    return sanitizedParts.join('');
  }).join('\n');
};

type StoredMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  createdAt: string
  extraInfo?: Record<string, unknown>
}

interface ChatViewProps {
  initialConversationId?: string
  defaultMessages?: StoredMessage[]
}

let cachedProviders: any[] | null = null

export default function ChatView({ initialConversationId, defaultMessages }: ChatViewProps) {
  const router = useRouter()
  const providerRef = useRef<ShancnChatProvider | null>(null)
  if (!providerRef.current) {
    providerRef.current = new ShancnChatProvider({
      request: XRequest<ChatInput>('/api/chat', { manual: true }),
    })
  }

  const senderRef = useRef<GetRef<typeof Sender>>(null)
  const bubbleListRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null)
  const conversationIdRef = useRef<string>(initialConversationId || '')
  const [activeAgentKey, setActiveAgentKey] = useState('')
  const [agentSkill, setAgentSkill] = useState<SenderProps['skill']>(undefined)
  const [agentSlotConfig, setAgentSlotConfig] = useState<SenderProps['slotConfig']>([])
  const [listening, setListening] = useState(false)
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('video-shancn-selected-model') || ''
    }
    return ''
  })
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [providers, setProviders] = useState<any[]>(() => cachedProviders || [])
  const [loadingProviders, setLoadingProviders] = useState(() => !cachedProviders)
  const [modelOptions, setModelOptions] = useState<Record<string, ModelOption>>(() =>
    buildModelOptions(cachedProviders || [])
  )

  const stableDefaultMessages = useMemo(() => {
    if (!defaultMessages || defaultMessages.length === 0) return undefined
    return defaultMessages.map((m) => ({
      message: {
        role: m.role === 'agent' ? 'assistant' : 'user',
        content: m.content,
      } as ChatMessage,
      status: 'success' as const,
      extraInfo: m.extraInfo,
    }))
  }, [])

  const hasPendingUserMessage = useMemo(() => {
    if (!defaultMessages || defaultMessages.length === 0) return false
    return defaultMessages[defaultMessages.length - 1].role === 'user'
  }, [])

  const defaultMessagesForChat = useMemo(() => {
    if (!stableDefaultMessages) return undefined
    if (hasPendingUserMessage) {
      return stableDefaultMessages.slice(0, -1)
    }
    return stableDefaultMessages
  }, [])

  useEffect(() => {
    if (!cachedProviders) {
      setLoadingProviders(true)
    }
    fetch('/api/llm-providers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          cachedProviders = data
          setProviders(data)
          const opts = buildModelOptions(data)
          setModelOptions(opts)

          // Prioritize loading saved selected model from localStorage
          const savedSelectedModel = localStorage.getItem('video-shancn-selected-model')
          if (savedSelectedModel && opts[savedSelectedModel]) {
            setSelectedModel(savedSelectedModel)
          } else {
            // Otherwise fallback to default provider logic
            const enabledProviders = data.filter((p: any) => p.enabled !== false)
            if (enabledProviders.length > 0) {
              // Find the default provider or the first enabled one
              const defaultProvider = enabledProviders.find((p: any) => p.isDefault) || enabledProviders[0]
              const modelList = defaultProvider.models.split(",").map((m: string) => m.trim()).filter(Boolean)
              
              let enabledMap: Record<string, boolean> = {}
              const saved = localStorage.getItem(`llm_enabled_models_${defaultProvider.id}`)
              if (saved) {
                try {
                  enabledMap = JSON.parse(saved)
                } catch {}
              }
              
              const firstEnabledModel = modelList.find((model: string) => enabledMap[model] !== false)
              if (firstEnabledModel && opts[firstEnabledModel]) {
                setSelectedModel(firstEnabledModel)
              } else {
                // Fallback: select the first model found in opts
                const optKeys = Object.keys(opts)
                if (optKeys.length > 0) {
                  setSelectedModel(optKeys[0])
                }
              }
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingProviders(false)
      })
  }, [])

  const isThinkingEnabled = useMemo(() => {
    if (selectedModel) {
      return modelOptions[selectedModel]?.enableThinking !== false
    }
    const defaultProvider = providers.find(p => p.isDefault) || providers[0]
    return defaultProvider ? defaultProvider.enableThinking !== false : true
  }, [selectedModel, modelOptions, providers])

  const hasConfiguredModels = useMemo(() => {
    return Object.keys(modelOptions).length > 0
  }, [modelOptions])

  const { messages, onRequest, isRequesting, abort, onReload, setMessage, setMessages, isDefaultMessagesRequesting } = useXChat<
    ChatMessage,
    ChatMessage,
    ChatInput
  >({
    provider: providerRef.current,
    defaultMessages: defaultMessagesForChat,
    requestPlaceholder: { content: '正在思考中...', role: 'assistant' },
    requestFallback: (_, { error }) => {
      if (error?.name === 'AbortError') {
        return { content: '已取消回复', role: 'assistant' }
      }
      return { content: '请求失败，请稍后重试', role: 'assistant' }
    },
  })

  const autoTriggeredRef = useRef(false)
  useEffect(() => {
    if (
      !isDefaultMessagesRequesting &&
      hasPendingUserMessage &&
      !autoTriggeredRef.current &&
      defaultMessages &&
      defaultMessages.length > 0
    ) {
      autoTriggeredRef.current = true
      const lastUserMsg = defaultMessages[defaultMessages.length - 1]
      const historyMsgs = defaultMessages.slice(0, -1)
      const history = historyMsgs.map((m) => ({
        role: m.role === 'agent' ? 'assistant' : 'user',
        content: m.content,
      }))
      onRequest({
        messages: [...history, { role: 'user', content: lastUserMsg.content }],
      })
    }
  }, [isDefaultMessagesRequesting, hasPendingUserMessage, defaultMessages, onRequest])

  const getHistory = useCallback((limitIndex?: number) => {
    const list = limitIndex !== undefined ? messages.slice(0, limitIndex) : messages;
    return list.map((m, idx) => {
      let displayedContent = m.message.content;
      if (m.message.role === 'user') {
        const versions = m.extraInfo?.versions || [];
        const activeIndex = m.extraInfo?.activeVersionIndex !== undefined 
          ? m.extraInfo.activeVersionIndex 
          : (versions.length > 0 ? versions.length - 1 : 0);
        displayedContent = versions.length > 0 
          ? versions[activeIndex]?.content || m.message.content
          : m.message.content;
      } else {
        let userMsg = null;
        for (let i = idx - 1; i >= 0; i--) {
          if (messages[i].message.role === 'user') {
            userMsg = messages[i];
            break;
          }
        }
        if (userMsg && userMsg.extraInfo?.versions) {
          const userVersions = userMsg.extraInfo.versions;
          const userActiveIndex = userMsg.extraInfo.activeVersionIndex ?? 0;
          const activeVariant = userVersions[userActiveIndex];
          if (activeVariant) {
            const responses = activeVariant.responses || [];
            const activeIndex = activeVariant.activeResponseIndex ?? 0;
            displayedContent = responses.length > 0 
              ? responses[activeIndex] || m.message.content
              : m.message.content;
          }
        }
      }
      return {
        role: m.message.role,
        content: displayedContent,
      };
    });
  }, [messages]);

  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const generatingMsgIdRef = useRef<string | number | null>(null)

  const handleSwitchVersion = useCallback((userMsgId: string | number | null, isAssistantSwitch: boolean, targetIndex: number) => {
    if (userMsgId) {
      const userMsg = messages.find(m => m.id === userMsgId)
      if (userMsg) {
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
                versions[currentActiveIdx] = {
                  ...versions[currentActiveIdx],
                  subsequentMessages: currentSubsequentMsgs
                }
              }
              
              const restoredFollowUpMsgs = selectedVersion?.subsequentMessages || []
              
              let prefixMessages = messages.slice(0, assistantIndex + 1)
              prefixMessages = prefixMessages.map((m) => {
                if (m.id === userMsgId) {
                  return {
                    ...m,
                    message: {
                      ...m.message,
                      content: selectedVersion?.content || m.message.content
                    },
                    extraInfo: {
                      ...m.extraInfo,
                      versions,
                      activeVersionIndex: targetIndex
                    }
                  }
                }
                if (m.id === assistantMsg.id && selectedVersion) {
                  const responses = selectedVersion.responses || []
                  const activeResponseIdx = selectedVersion.activeResponseIndex ?? 0
                  const selectedResponse = responses[activeResponseIdx] || m.message.content
                  return {
                    ...m,
                    message: {
                      ...m.message,
                      content: selectedResponse
                    }
                  }
                }
                return m
              })
              
              const updatedMessages = [...prefixMessages, ...restoredFollowUpMsgs]
              setMessages(updatedMessages)
            }
          }
        } else {
          const versions = userMsg.extraInfo?.versions ? [...userMsg.extraInfo.versions] : []
          const activeIndex = userMsg.extraInfo?.activeVersionIndex ?? 0
          if (versions[activeIndex]) {
            versions[activeIndex] = {
              ...versions[activeIndex],
              activeResponseIndex: targetIndex
            }
            
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
                  if (m.id === userMsgId) {
                    return {
                      ...m,
                      extraInfo: {
                        ...m.extraInfo,
                        versions
                      }
                    }
                  }
                  if (m.id === assistantMsg.id) {
                    return {
                      ...m,
                      message: {
                        ...m.message,
                        content: selectedResponse
                      }
                    }
                  }
                  return m
                })
                setMessages([...updatedMessages, ...currentSubsequentMsgs])
              }
            }
          }
        }
      }
    }
  }, [messages, setMessage, setMessages])

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
        subsequentMessages: subsequentMessages
      }]
    } else {
      if (versions[currentActiveIndex]) {
        versions[currentActiveIndex] = {
          ...versions[currentActiveIndex],
          subsequentMessages: subsequentMessages
        }
      }
    }

    const newVariant = {
      content: editingContent,
      responses: [],
      activeResponseIndex: 0,
      subsequentMessages: []
    }
    versions.push(newVariant)
    const newIndex = versions.length - 1

    setMessage(id, {
      message: {
        role: 'user',
        content: editingContent,
      },
      extraInfo: {
        ...userMsg.extraInfo,
        versions,
        activeVersionIndex: newIndex,
      }
    })

    if (assistantMsg) {
      const assistantIndex = messages.findIndex((m) => m.id === assistantMsg.id)
      if (assistantIndex !== -1) {
        const updatedMessages = messages.slice(0, assistantIndex + 1)
        setMessages(updatedMessages)
      }

      setMessage(assistantMsg.id, {
        message: {
          role: 'assistant',
          content: '',
          thinking: '',
        },
        status: 'loading'
      })

      const history = getHistory(msgIndex)
      onReload(assistantMsg.id, {
        messages: [...history, { role: 'user', content: editingContent }],
        model: selectedModel || undefined,
        provider: selectedModel ? modelOptions[selectedModel]?.provider : undefined,
      })
    }

    setEditingId(null)
  }, [editingContent, messages, setMessage, setMessages, onReload, selectedModel, modelOptions, getHistory])

  useEffect(() => {
    if (messages.length === 0) return

    if (!conversationIdRef.current) {
      conversationIdRef.current = `conv_${Date.now()}`
    }

    const firstUserMsg = messages.find((m) => m.message.role === 'user')
    const chatMessages = messages.map((m) => ({
      id: String(m.id),
      role: (m.message.role === 'assistant' ? 'agent' : 'user') as 'user' | 'agent',
      content: m.message.content,
      createdAt: new Date().toISOString(),
      extraInfo: m.extraInfo,
    }))

    const conversation = {
      id: conversationIdRef.current,
      title: firstUserMsg?.message.content?.slice(0, 40) || '新对话',
      messages: chatMessages,
      createdAt: conversationIdRef.current.replace('conv_', ''),
      updatedAt: new Date().toISOString(),
    }

    try {
      const raw = localStorage.getItem('video-shancn-chats')
      const existing = raw ? JSON.parse(raw) : []
      const idx = existing.findIndex((c: { id: string }) => c.id === conversation.id)
      if (idx >= 0) {
        existing[idx] = conversation
      } else {
        existing.unshift(conversation)
      }
      localStorage.setItem('video-shancn-chats', JSON.stringify(existing))
    } catch {
    }
  }, [messages])

  useEffect(() => {
    messages.forEach(({ id, message, status }) => {
      if (message.role === 'assistant' && (status === 'loading' || status === 'updating')) {
        generatingMsgIdRef.current = id
      }
    })
  }, [messages])

  useEffect(() => {
    messages.forEach(({ id, message, status }) => {
      if (message.role === 'assistant' && status === 'success' && generatingMsgIdRef.current === id) {
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
            const currentContent = message.content

            let versions = [...existingVersions]
            if (versions.length === 0) {
              versions = [{
                content: userMsg.message.content,
                responses: [currentContent],
                activeResponseIndex: 0
              }]
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
              extraInfo: {
                ...userMsg.extraInfo,
                versions,
                activeVersionIndex: userActiveIndex
              }
            })
          }
        }
        generatingMsgIdRef.current = null
      }
    })
  }, [messages, setMessage])

  useEffect(() => {
    if (bubbleListRef.current) {
      bubbleListRef.current.scrollTop = bubbleListRef.current.scrollHeight
    }
  }, [messages])

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognitionAPI: { new (): SpeechRecognition } | undefined =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      message.warning('当前浏览器不支持语音识别')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => {
      setListening(false)
      message.error('语音识别失败，请重试')
    }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript && senderRef.current) {
        const textarea = (senderRef.current as any)?.nativeElement?.querySelector?.('textarea')
        if (textarea) {
          const start = textarea.selectionStart ?? textarea.value.length
          const before = textarea.value.slice(0, start)
          const after = textarea.value.slice(textarea.selectionEnd ?? start)
          const newValue = before + transcript + after
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )?.set
          setter?.call(textarea, newValue)
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
          textarea.focus()
          textarea.setSelectionRange(start + transcript.length, start + transcript.length)
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [listening])

  const agentItems: MenuProps['items'] = Object.keys(AgentInfo).map((key) => ({
    key,
    icon: AgentInfo[key].icon,
    label: AgentInfo[key].label,
  }))

  const modelItems: MenuProps['items'] = Object.entries(modelOptions).map(([key, { label, provider, logo }]) => {
    let avatar: React.ReactNode
    if (provider) {
      avatar = getProviderAvatar(provider, 20, 'circle', logo)
    } else {
      const defaultProvider = providers.find((p) => p.isDefault) || providers[0]
      avatar = defaultProvider
        ? getProviderAvatar(defaultProvider.name, 20, 'circle', defaultProvider.logo)
        : <RobotOutlined />
    }
    return {
      key,
      icon: avatar,
      label,
    }
  })

  const filteredModelItems = useMemo(() => {
    const query = modelSearchQuery.trim().toLowerCase()
    if (!query) return modelItems
    const filtered = modelItems.filter(item => {
      if (!item) return false
      const labelStr = 'label' in item && typeof item.label === 'string' ? item.label : ''
      return labelStr.toLowerCase().includes(query)
    })
    
    if (filtered.length === 0) {
      return [
        {
          key: 'no-results',
          label: <span className="text-muted-foreground/60 text-xs select-none">无匹配模型</span>,
          disabled: true,
        }
      ]
    }
    return filtered
  }, [modelItems, modelSearchQuery])

  const handleAgentClick: MenuProps['onClick'] = (item) => {
    setActiveAgentKey(item.key)
    setAgentSkill(AgentInfo[item.key].skill)
    setAgentSlotConfig(JSON.parse(JSON.stringify(AgentInfo[item.key].slotConfig)))
  }

  const hasMessages = messages.length > 0

  const senderNode = (
    <div className={`px-4 py-3 max-w-2xl mx-auto w-full ${hasMessages ? 'shrink-0 border-t border-border/45 bg-background/60 backdrop-blur-sm' : ''}`}>
      <Sender
        ref={senderRef}
        loading={isRequesting}
        skill={agentSkill}
        slotConfig={agentSlotConfig}
        placeholder="输入消息，Enter 发送"
        autoSize={{ minRows: 2, maxRows: 6 }}
        suffix={false}
        footer={(actionNode) => (
          <Flex justify="space-between" align="center">
            <Flex gap="small" align="center">
              {loadingProviders ? (
                <Button
                  style={iconStyle}
                  type="text"
                  icon={<RobotOutlined spin />}
                />
              ) : !hasConfiguredModels ? (
                <Button
                  style={iconStyle}
                  type="text"
                  icon={<RobotOutlined />}
                  onClick={() => router.push('/settings/llm')}
                  title="未配置 AI 模型，点击前往设置"
                />
              ) : (
                <Dropdown
                  placement="topLeft"
                  menu={{
                    selectedKeys: [selectedModel],
                    onClick: ({ key }) => {
                      setSelectedModel(key)
                      localStorage.setItem('video-shancn-selected-model', key)
                      setModelSearchQuery('')
                    },
                    items: filteredModelItems,
                    style: { height: 240, overflowY: 'auto', border: 'none', boxShadow: 'none', background: 'transparent' },
                  }}
                  dropdownRender={(menu) => (
                    <div className="bg-popover text-popover-foreground rounded-lg border border-border shadow-md" style={{ minWidth: 200 }}>
                      <div className="p-2 border-b border-border">
                        <SearchInput
                          placeholder="搜索模型..."
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="h-8 text-xs bg-muted/40"
                        />
                      </div>
                      {menu}
                    </div>
                  )}
                  onOpenChange={(open) => {
                    if (!open) {
                      setModelSearchQuery('')
                    }
                  }}
                >
                  <Button
                    style={iconStyle}
                    type="text"
                    icon={(() => {
                      if (selectedModel && modelOptions[selectedModel]?.provider) {
                        return getProviderAvatar(
                          modelOptions[selectedModel].provider!,
                          20,
                          'circle',
                          modelOptions[selectedModel].logo
                        )
                      }
                      const defaultProvider = providers.find((p) => p.isDefault) || providers[0]
                      return defaultProvider
                        ? getProviderAvatar(defaultProvider.name, 20, 'circle', defaultProvider.logo)
                        : <RobotOutlined />
                    })()}
                    title={modelOptions[selectedModel]?.label || '模型'}
                  />
                </Dropdown>
              )}
              <Button style={iconStyle} type="text" icon={<PaperClipOutlined />} />
              <Dropdown
                placement="topLeft"
                menu={{
                  selectedKeys: [activeAgentKey],
                  onClick: handleAgentClick,
                  items: agentItems,
                }}
              >
                <Button
                  style={iconStyle}
                  type="text"
                  icon={activeAgentKey ? AgentInfo[activeAgentKey]?.icon : <AntDesignOutlined />}
                  title={activeAgentKey ? AgentInfo[activeAgentKey]?.label : '快捷功能'}
                />
              </Dropdown>
            </Flex>
            <Flex align="center">
              <Button
                type="text"
                style={{ ...iconStyle, color: listening ? '#1677ff' : undefined }}
                icon={listening ? <AudioFilled /> : <AudioOutlined />}
                onClick={handleVoiceInput}
              />
              <Divider orientation="vertical" />
              {actionNode}
            </Flex>
          </Flex>
        )}
        onChange={(value, event, slotConfig, skill) => {
          if (!skill) {
            if (activeAgentKey !== '' || agentSkill !== undefined || (agentSlotConfig && agentSlotConfig.length > 0)) {
              setActiveAgentKey('')
              setAgentSkill(undefined)
              setAgentSlotConfig([])
            }
          }
        }}
        onSubmit={(content, _, skill) => {
          let query = content
          if (skill?.value) {
            query = `[${skill.value}] ${content}`
          }

          if (!conversationIdRef.current) {
            const convId = `conv_${Date.now()}`
            conversationIdRef.current = convId

            const conversation = {
              id: convId,
              title: query.slice(0, 40) || '新对话',
              messages: [{
                id: 'msg_0',
                role: 'user' as const,
                content: query,
                createdAt: new Date().toISOString(),
              }],
              createdAt: convId.replace('conv_', ''),
              updatedAt: new Date().toISOString(),
            }

            try {
              const raw = localStorage.getItem('video-shancn-chats')
              const existing = raw ? JSON.parse(raw) : []
              existing.unshift(conversation)
              localStorage.setItem('video-shancn-chats', JSON.stringify(existing))
            } catch {}

            router.replace(`/ai-assistant/${convId}`)
            return
          }

          const history = getHistory()
          onRequest({
            messages: [...history, { role: 'user', content: query }],
            model: selectedModel || undefined,
            provider: selectedModel ? modelOptions[selectedModel]?.provider : undefined,
          })
          
          setActiveAgentKey('')
          setAgentSkill(undefined)
          setAgentSlotConfig([])
          
          setTimeout(() => {
            senderRef.current?.clear?.()
          }, 0)
        }}
        onCancel={() => {
          abort()
          message.error('已取消发送')
        }}
      />
    </div>
  )

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-background">
      {hasMessages ? (
        <>
          <div ref={bubbleListRef} className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
            <Bubble.List
              role={{
                assistant: {
                  placement: 'start',
                  styles: { content: { backgroundColor: '#f5f5f5' } },
                  contentRender: (msg: ChatMessage & { status?: string }) => (
                    <div>
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
                            animationConfig: { fadeDuration: 150 },
                            tail: msg.status === 'updating' || msg.status === 'loading'
                              ? { content: '▋' }
                              : false,
                          }}
                          components={{
                            think: ({ children }: any) => {
                              if (!isThinkingEnabled) return null
                              return (
                                <Think title="思考过程" defaultExpanded={false} className="mb-3">
                                  <div className="text-xs text-muted-foreground/70 whitespace-pre-wrap font-sans">
                                    {children}
                                  </div>
                                </Think>
                              )
                            },
                            sources: ({ children }: any) => (
                              <div className="mt-3 border-t border-border/40 pt-3">
                                <div className="text-xs font-semibold text-foreground/80 mb-2 flex items-center gap-1.5 select-none">
                                  <ImportOutlined style={{ color: '#1677ff' }} /> 引用与溯源
                                </div>
                                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                                  {children}
                                </div>
                              </div>
                            ),
                            pre: ({ children }: any) => <>{children}</>,
                            code: ({ className, children, ...props }: ComponentProps) => {
                              const codeString = Array.isArray(children)
                                ? children.join('')
                                : typeof children === 'string'
                                  ? children
                                  : String(children || '')

                                const { domNode, block, lang: propLang, streamStatus, ...restProps } = props as any
                                const isBlock = block || className?.includes('language-') || codeString.includes('\n')

                                if (!isBlock) {
                                  return <code className={className} {...restProps}>{children}</code>
                                }

                              const lang = (className?.match(/language-(\w+)/)?.[1] || propLang || 'plaintext').toLowerCase()

                              if (lang === 'mermaid') {
                                const isFinished = !msg.status || msg.status === 'success' || msg.status === 'error' || msg.status === 'abort';
                                
                                if (isFinished) {
                                  const sanitized = sanitizeMermaid(codeString)
                                  return <Mermaid>{sanitized}</Mermaid>
                                } else {
                                  return <CodeHighlighter lang="mermaid" prismLightMode={false}>{codeString}</CodeHighlighter>
                                }
                              }

                              return <CodeHighlighter lang={lang} prismLightMode={false}>{codeString}</CodeHighlighter>
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
                  styles: { content: { backgroundColor: '#e6f4ff' } },
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
                            <Button size="small" onClick={() => setEditingId(null)}>
                              取消
                            </Button>
                            <Button size="small" type="primary" onClick={() => handleSaveEdit(msg.id)}>
                              确认
                            </Button>
                          </Flex>
                        </div>
                      )
                    }
                    return <div className="whitespace-pre-wrap">{msg.content}</div>
                  }
                },
              }}
              items={messages.map(({ id, message, status, extraInfo }) => {
                let displayedContent = message.content;
                let versions: any[] = [];
                let activeIndex = 0;
                let isUser = message.role === 'user';

                if (isUser) {
                  versions = extraInfo?.versions || [];
                  activeIndex = extraInfo?.activeVersionIndex !== undefined 
                    ? extraInfo.activeVersionIndex 
                    : (versions.length > 0 ? versions.length - 1 : 0);
                  displayedContent = versions.length > 0 
                    ? versions[activeIndex]?.content || message.content
                    : message.content;
                } else {
                  const msgIndex = messages.findIndex((m) => m.id === id);
                  let userMsg = null;
                  if (msgIndex !== -1) {
                    for (let i = msgIndex - 1; i >= 0; i--) {
                      if (messages[i].message.role === 'user') {
                        userMsg = messages[i];
                        break;
                      }
                    }
                  }

                  if (userMsg && userMsg.extraInfo?.versions) {
                    const userVersions = userMsg.extraInfo.versions;
                    const userActiveIndex = userMsg.extraInfo.activeVersionIndex ?? 0;
                    const activeVariant = userVersions[userActiveIndex];
                    if (activeVariant) {
                      versions = activeVariant.responses || [];
                      activeIndex = activeVariant.activeResponseIndex ?? 0;
                      displayedContent = versions.length > 0 
                        ? versions[activeIndex] || message.content
                        : message.content;
                    }
                  }
                }

                return {
                  key: id,
                  role: message.role as 'user' | 'assistant',
                  content: message.role === 'assistant' ? { ...message, content: displayedContent, status } : { id, content: displayedContent },
                  loading: status === 'loading',
                  footer: message.role === 'assistant' && status !== 'loading' && status !== 'updating' ? (
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
                                const msgIndex = messages.findIndex((m) => m.id === id);
                                let userMsg = null;
                                if (msgIndex !== -1) {
                                  for (let i = msgIndex - 1; i >= 0; i--) {
                                    if (messages[i].message.role === 'user') {
                                      userMsg = messages[i];
                                      break;
                                    }
                                  }
                                }
                                if (userMsg) {
                                  handleSwitchVersion(userMsg.id, true, page - 1);
                                }
                              }}
                            />
                          )
                        }] : []),
                        {
                          key: 'copy',
                          actionRender: () => <Actions.Copy text={displayedContent} />,
                        },
                        {
                          key: 'retry',
                          icon: <RedoOutlined />,
                          label: '重新生成',
                        },
                      ]}
                      onClick={({ key }) => {
                        if (key === 'retry') {
                          const msgIndex = messages.findIndex((m) => m.id === id)
                          let userMsg = null
                          for (let i = msgIndex - 1; i >= 0; i--) {
                            if (messages[i].message.role === 'user') {
                              userMsg = messages[i]
                              break
                            }
                          }

                          setMessage(id, {
                            message: {
                              ...message,
                              content: '',
                              thinking: ''
                            },
                            status: 'loading'
                          })

                          let userMsgIndex = -1
                          if (userMsg) {
                            userMsgIndex = messages.findIndex((m) => m.id === userMsg.id)
                          }
                          const history = userMsgIndex !== -1 ? getHistory(userMsgIndex) : []

                          onReload(id, {
                            messages: userMsg
                              ? [...history, { role: userMsg.message.role, content: userMsg.message.content }]
                              : [],
                            model: selectedModel || undefined,
                            provider: selectedModel ? modelOptions[selectedModel]?.provider : undefined,
                          })
                        }
                      }}
                      variant="borderless"
                    />
                  ) : (message.role === 'user' && editingId !== id && (
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
                                handleSwitchVersion(id, false, page - 1);
                              }}
                            />
                          )
                        }] : []),
                        {
                          key: 'edit',
                          icon: <EditOutlined />,
                          label: '编辑',
                        }
                      ]}
                      onClick={({ key }) => {
                        if (key === 'edit') {
                          setEditingId(id)
                          setEditingContent(displayedContent)
                        }
                      }}
                      variant="borderless"
                    />
                  )),
                }
              })}
            />
          </div>
          {senderNode}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center px-4">
          <div className="flex-1 min-h-0" />
          <div className="flex items-center gap-4 select-none">
            <div className="size-14 rounded-full overflow-hidden shrink-0">
              <img
                src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
                alt="logo"
                className="size-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground/85 mb-1">
                欢迎使用视频学习助手
              </h2>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                搜索视频、导入链接、分析内容 — 你的 AI 学习伙伴
              </p>
            </div>
          </div>
          <div className="mt-10 w-full" style={{ minHeight: 180 }}>
            {senderNode}
          </div>
          <div className="flex-[0.8] min-h-0" />
        </div>
      )}
    </div>
  )
}
