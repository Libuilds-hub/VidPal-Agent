'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ChatView from '@/components/chat/chat-view'
import { readStored } from '@/lib/storage'

type StoredMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  createdAt: string
  extraInfo?: Record<string, unknown>
}

type Conversation = {
  id: string
  title: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = readStored("chats")
      if (raw) {
        const all: Conversation[] = JSON.parse(raw)
        const found = all.find((c) => c.id === id)
        if (found) {
          setConversation(found)
        }
      }
    } catch {}
    setLoaded(true)
  }, [id])

  if (!loaded) return null

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>对话不存在或已被删除</p>
        <button
          onClick={() => router.replace('/ai-assistant/new-chat')}
          className="text-sm text-blue-500 hover:underline cursor-pointer"
        >
          开始新对话
        </button>
      </div>
    )
  }

  return (
    <ChatView
      key={conversation.id}
      initialConversationId={conversation.id}
      defaultMessages={conversation.messages}
    />
  )
}
