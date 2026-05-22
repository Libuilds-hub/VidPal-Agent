"use client"

import { useState } from "react"
import { Bot, CopyIcon, RefreshCwIcon, PencilIcon, CheckIcon, UserIcon, SparklesIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessage } from "./types"

interface ChatMessageProps {
  message: ChatMessage
  onRegenerate?: () => void
  onEdit?: (newContent: string) => void
}

export function ChatMessageBubble({ message, onRegenerate, onEdit }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEdit = () => {
    if (editing) {
      onEdit?.(editValue)
      setEditing(false)
    } else {
      setEditValue(message.content)
      setEditing(true)
    }
  }

  return (
    <div className="flex gap-3 group py-3 border-b border-border/20 last:border-b-0">
      {/* Avatar */}
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded border select-none mt-0.5",
          isUser
            ? "bg-muted border-border/40 text-muted-foreground/70"
            : "bg-foreground border-none text-background"
        )}
      >
        {isUser ? (
          <UserIcon className="h-3 w-3" />
        ) : (
          <SparklesIcon className="h-3 w-3" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Meta row */}
        <div className="flex items-center gap-2 select-none">
          <span className="text-[11px] font-semibold text-foreground/80">
            {isUser ? "You" : "AI 助手"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/45">
            {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Message body */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setEditing(false) }}
              className="w-full rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-[13px] outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 resize-none min-h-[60px] [scrollbar-width:none]"
              rows={3}
              autoFocus
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setEditing(false)}
                className="h-6 px-2.5 rounded text-[10px] border border-border/40 text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150"
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                className="h-6 px-2.5 rounded text-[10px] bg-foreground text-background hover:bg-foreground/90 transition-all duration-150 font-medium"
              >
                确认
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] leading-[1.7] text-foreground/80 whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Action buttons — appear on hover */}
        {!editing && (
          <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button onClick={handleCopy} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150" title="复制">
              {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
            </button>
            {isUser ? (
              <button onClick={handleEdit} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150" title="编辑">
                <PencilIcon className="h-3 w-3" />
              </button>
            ) : (
              <button onClick={onRegenerate} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150" title="重新生成">
                <RefreshCwIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
