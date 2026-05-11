"use client"

import { Bot, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessage } from "./types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ChatMessageProps {
  message: ChatMessage
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 bg-primary/10">
          <AvatarFallback>
            <Bot className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-blue-100 dark:bg-blue-900/30 text-foreground"
            : "bg-card border border-border shadow-sm"
        )}
      >
        {!isUser && (
          <div className="text-xs font-medium text-muted-foreground mb-1">AI 助手</div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}