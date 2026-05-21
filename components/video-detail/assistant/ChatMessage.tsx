"use client"

import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessage } from "./types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ChatMessageProps {
  message: ChatMessage
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser && (
        <Avatar className="h-7 w-7 shrink-0 bg-primary/10 ring-1 ring-primary/10">
          <AvatarFallback>
            <Bot className="h-3.5 w-3.5 text-primary/70" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-white border border-border/30 shadow-sm"
        )}
      >
        {!isUser && (
          <div className="text-[11px] font-medium text-muted-foreground/60 mb-0.5 tracking-wide">AI 助手</div>
        )}
        <p className="text-[13px] leading-[1.65] whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
