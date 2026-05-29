"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { SettingRow } from "@/components/settings/settings-ui"
import { BotIcon } from "lucide-react"

export default function AssistantPage() {
  const [assistantName, setAssistantName] = useState("AI 智能助手")
  const [assistantAvatar, setAssistantAvatar] = useState("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem("assistant-settings")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.name) setAssistantName(parsed.name)
        if (parsed.avatar) setAssistantAvatar(parsed.avatar)
      }
    } catch {}
  }, [])

  function persistName(name: string) {
    const settings = { name, avatar: assistantAvatar }
    localStorage.setItem("assistant-settings", JSON.stringify(settings))
  }

  function persistAvatar(dataUrl: string) {
    const settings = { name: assistantName, avatar: dataUrl }
    localStorage.setItem("assistant-settings", JSON.stringify(settings))
  }

  function removeAvatar() {
    setAssistantAvatar("")
    const settings = { name: assistantName, avatar: "" }
    localStorage.setItem("assistant-settings", JSON.stringify(settings))
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <SettingsPageHeader title="AI 助手" description="自定义 AI 智能助手的名称与头像外观" />
      <div className="max-w-2xl space-y-5 animate-in fade-in-50 duration-150">
        <p className="text-[11.5px] text-muted-foreground/80 mb-3 leading-normal">自定义 AI 智能助手的显示名称和头像，打造属于你的个性化学习伙伴</p>

        <div className="flex items-center gap-4 pb-4 border-b border-border/20">
          <label className="relative cursor-pointer group shrink-0">
            <div className="size-16 rounded-2xl border border-border/40 bg-muted/50 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-primary/40 transition-all duration-200">
              {assistantAvatar ? (
                <img src={assistantAvatar} alt="助手头像" className="size-full object-cover" />
              ) : (
                <BotIcon className="size-7 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 rounded-2xl flex items-center justify-center">
                <span className="text-[10px] text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">更换</span>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  setAssistantAvatar(reader.result as string)
                  persistAvatar(reader.result as string)
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">助手头像</div>
            <div className="text-[11px] text-muted-foreground/60 mt-0.5">点击头像上传自定义图片，支持 PNG / JPG / WebP</div>
            {assistantAvatar && (
              <button onClick={removeAvatar} className="mt-2 text-[10px] text-muted-foreground/50 hover:text-red-500 transition-colors cursor-pointer">
                移除自定义头像
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <SettingRow label="助手名称" description="显示在对话页面顶部的助手名字">
            <Input
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              onBlur={() => persistName(assistantName)}
              placeholder="AI 智能助手"
              className="w-[200px] h-8 text-[12px]"
            />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}
