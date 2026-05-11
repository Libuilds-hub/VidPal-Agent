"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bot, Send, MessageCircle } from "lucide-react"
import { ChatMessage } from "./types"
import { ChatMessageBubble } from "./ChatMessage"
import { TypingIndicator } from "./TypingIndicator"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"

const MOCK_RESPONSES = [
  "根据视频内容，这个问题涉及到几个关键点：首先，视频中提到了核心概念的定义和背景。其次，相关的实际案例展示了这些理论的应用场景。最后，还有一些实用的技巧可以帮助你更好地理解和应用。",
  "视频中对这个话题进行了详细的探讨。从内容来看，主要包含三个方面：基础概念的解析、实际应用的案例分析，以及常见问题的解决方案。希望这些信息对你有帮助。",
  "这是一个很好的问题！视频中确实有提到相关内容。我来总结一下：视频指出这个主题的核心在于理解其基本原理，并通过具体案例展示了如何将理论付诸实践。",
  "关于您的问题，我需要指出的是，视频中从多个角度进行了分析。从技术层面来看，这涉及到几个重要概念；从实践角度，则需要结合实际情况来灵活运用。",
  "视频内容表明，这个主题可以分为以下几个层次来理解：首先是最基本的概念定义，然后是相关的原理机制，接着是实际的应用场景，最后还有一些需要注意的事项和技巧。",
]

const SUGGESTED_QUESTIONS = [
  "视频的主题是什么？",
  "有哪些关键要点？",
  "总结一下主要内容",
]

export function QAAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || isTyping) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    const delay = 800 + Math.random() * 700
    setTimeout(() => {
      const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, delay)
  }, [inputValue, isTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question)
    setTimeout(() => {
      const event = new CustomEvent("submit-question")
      textareaRef.current?.dispatchEvent(event)
    }, 100)
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleSubmit = () => handleSend()
    textarea.addEventListener("submit-question", handleSubmit)
    return () => textarea.removeEventListener("submit-question", handleSubmit)
  }, [handleSend])

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="relative mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl" />
              <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center mx-auto">
                <Bot className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              我是视频问答助手
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              基于视频内容智能分析，随时为你答疑解惑
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="text-xs px-4 py-2 rounded-lg bg-background border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-muted-foreground hover:text-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => setInputValue(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="bg-card border border-border shadow-sm rounded-2xl px-4 py-2.5">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="border-t p-3 shrink-0">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题..."
            className="min-h-[44px] max-h-[120px] resize-none bg-muted/50 border border-input focus-visible:ring-1"
            rows={1}
            disabled={isTyping}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="shrink-0 h-[44px] w-[44px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}