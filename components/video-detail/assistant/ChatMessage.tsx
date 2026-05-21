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
        <Avatar className="h-6 w-6 shrink-0 bg-muted">
          <AvatarFallback>
            <Bot className="h-3 w-3 text-muted-foreground/50" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-foreground/80"
        )}
      >
        {!isUser && (
          <div className="text-[10px] font-medium text-muted-foreground/50 mb-1 tracking-wide">AI 助手</div>
        )}
        <p className="text-[13px] leading-[1.7] whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
