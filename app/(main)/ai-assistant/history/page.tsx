"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  SearchIcon,
  Trash2Icon,
  MessageSquareIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { readStored, writeStored } from "@/lib/storage"

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
  } catch {
    return ""
  }
}

export default function ChatHistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const localChats = readStored("chats")
    if (localChats) {
      try {
        setConversations(JSON.parse(localChats))
      } catch {
        console.error("Failed to parse history")
      }
    }
  }, [])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm("确定要删除这条对话记录吗？")) {
      const updated = conversations.filter((c) => c.id !== id)
      setConversations(updated)
      writeStored("chats", JSON.stringify(updated))
    }
  }

  const handleClearAll = () => {
    if (confirm("确定要清空所有的历史对话记录吗？此操作无法撤销。")) {
      setConversations([])
      writeStored("chats", JSON.stringify([]))
    }
  }

  const filtered = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      conv.title.toLowerCase().includes(query) ||
      conv.messages.some((m) => m.content.toLowerCase().includes(query))
    )
  })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background">
      <div className="flex flex-col gap-5 px-6 py-6 max-w-2xl w-full mx-auto">

        {/* Search */}
        <div className="relative w-full select-none animate-in fade-in duration-200">
          <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/35" />
          <input
            type="text"
            placeholder="搜索对话"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 h-11 text-sm rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 bg-background/60 outline-none transition-all duration-150 focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/40 font-medium"
          />
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between select-none">
          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-mono">近期</span>
          {conversations.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] text-muted-foreground/45 hover:text-rose-500 transition-colors cursor-pointer font-semibold"
            >
              清空记录
            </button>
          )}
        </div>

        {/* List */}
        {filtered.length > 0 ? (
          <div className="flex flex-col">
            {filtered.map((conv) => (
              <Link
                key={conv.id}
                href={`/ai-assistant/${conv.id}`}
                className="group flex items-center justify-between py-3 px-2.5 -mx-2.5 rounded-lg hover:bg-muted/20 transition-colors duration-150 cursor-pointer select-none"
              >
                <span className="text-[13px] text-foreground/80 font-medium truncate pr-8 group-hover:text-foreground transition-colors">
                  {conv.title || "未命名对话"}
                </span>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[11px] text-muted-foreground/45 font-mono group-hover:opacity-75 transition-opacity">
                    {formatChineseDate(conv.updatedAt || conv.createdAt)}
                  </span>

                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/35 transition-all cursor-pointer duration-150"
                    title="删除对话"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200/80 dark:border-zinc-800/80 bg-card/10 select-none">
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card/85 text-muted-foreground/60 shadow-xs">
                <MessageSquareIcon className="size-5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground/80">
                {searchQuery ? "未找到匹配的对话记录" : "暂无历史对话"}
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/65 leading-normal">
                {searchQuery
                  ? "请尝试更换搜索关键词"
                  : "暂无对话记录"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-5 flex items-center gap-1.5 h-7 px-3 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg cursor-pointer transition-all"
                >
                  清除搜索
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
