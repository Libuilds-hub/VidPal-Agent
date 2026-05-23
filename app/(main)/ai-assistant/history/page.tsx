"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  SearchIcon, 
  Trash2Icon,
} from "lucide-react"

type Message = {
  id: string
  role: "user" | "agent"
  content: string
  createdAt: string
}

type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

function formatChineseDate(dateStr: string) {
  try {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  } catch (e) {
    return ""
  }
}

export default function ChatHistoryPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const localChats = localStorage.getItem("video-shancn-chats")
    if (localChats) {
      try {
        setConversations(JSON.parse(localChats))
      } catch (e) {
        console.error("Failed to parse history", e)
      }
    }
  }, [])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (confirm("确定要删除这条对话记录吗？")) {
      const updated = conversations.filter((c) => c.id !== id)
      setConversations(updated)
      localStorage.setItem("video-shancn-chats", JSON.stringify(updated))
    }
  }

  const handleClearAll = () => {
    if (confirm("确定要清空所有的历史对话记录吗？此操作无法撤销。")) {
      setConversations([])
      localStorage.setItem("video-shancn-chats", JSON.stringify([]))
    }
  }

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    const matchesTitle = conv.title.toLowerCase().includes(query)
    const matchesMessages = conv.messages.some((m) => 
      m.content.toLowerCase().includes(query)
    )
    
    return matchesTitle || matchesMessages
  })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background/50 relative px-6 py-12 scrollbar-hide">
      
      <div className="max-w-2xl w-full mx-auto flex flex-col mt-4">
        
        {/* Large Premium Pill Search Input */}
        <div className="relative w-full mb-10 select-none">
          <SearchIcon className="absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/45" />
          <input
            type="text"
            placeholder="搜索聊天"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 text-[14px] rounded-full border border-border/40 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:border-border/80 focus:shadow-[0_2px_16px_rgba(0,0,0,0.025)] outline-none transition-all placeholder:text-muted-foreground/35"
          />
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 pl-2 select-none">
          <span className="text-[13px] font-medium text-muted-foreground/45 tracking-wide">近期</span>
          {conversations.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] text-muted-foreground/45 hover:text-red-500 transition-colors cursor-pointer select-none"
            >
              清空记录
            </button>
          )}
        </div>

        {/* Minimalist List of Conversations */}
        {filteredConversations.length > 0 ? (
          <div className="flex flex-col">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => router.push(`/ai-assistant?id=${conv.id}`)}
                className="group flex items-center justify-between py-3.5 px-2 rounded-lg hover:bg-muted/30 transition-all duration-150 cursor-pointer"
              >
                {/* Title */}
                <span className="text-[14px] text-foreground/80 font-normal truncate pr-8 group-hover:text-foreground transition-colors">
                  {conv.title || "未命名对话"}
                </span>

                {/* Right side Metadata & Actions */}
                <div className="flex items-center gap-4.5 shrink-0 select-none">
                  {/* Date (Chinese standard) */}
                  <span className="text-[13px] text-muted-foreground/45 font-normal tracking-wide transition-all group-hover:opacity-75">
                    {formatChineseDate(conv.updatedAt || conv.createdAt)}
                  </span>
                  
                  {/* Hover Actions */}
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 text-muted-foreground/40 transition-all cursor-pointer duration-100"
                    title="删除对话"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 select-none">
            <p className="text-[13.5px] text-muted-foreground/45">
              {searchQuery ? "未找到相关的历史对话记录" : "暂无历史对话"}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
