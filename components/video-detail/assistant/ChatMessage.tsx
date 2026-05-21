"use client"

import { useState } from "react"
import { Bot, CopyIcon, RefreshCwIcon, PencilIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessage } from "./types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser && (
        <Avatar className="h-7 w-7 shrink-0 bg-muted">
          <AvatarFallback>
            <Bot className="h-3.5 w-3.5 text-muted-foreground/50" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={editing ? "w-[360px]" : "max-w-[80%]"}>
        <div
          className={cn(
            "rounded-xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-[#E8E5E1] text-foreground/80"
          )}
        >
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setEditing(false) }}
                className="w-full bg-white/20 rounded-md px-2 py-1.5 text-[13px] outline-none border-0 resize-none min-h-[60px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1 rounded-md text-[11px] bg-white/20 hover:bg-white/30 transition-all duration-150"
                >
                  取消
                </button>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 rounded-md text-[11px] bg-white/40 hover:bg-white/50 transition-all duration-150 font-medium"
                >
                  确认
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] leading-[1.7] whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Action buttons */}
        {!editing && (
        <div className={cn("flex items-center gap-0.5 mt-1 px-1", isUser ? "flex-row-reverse" : "")}>
          {isUser ? (
            <>
              <button onClick={handleCopy} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150" title="复制">
                {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
              </button>
              <button onClick={handleEdit} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150" title="编辑">
                <PencilIcon className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCopy} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150" title="复制">
                {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
              </button>
              <button onClick={onRegenerate} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/60 transition-all duration-150" title="重新生成">
                <RefreshCwIcon className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
