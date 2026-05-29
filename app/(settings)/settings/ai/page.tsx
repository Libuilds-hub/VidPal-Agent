"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { Toggle, SettingRow } from "@/components/settings/settings-ui"
import { Loader2 } from "lucide-react"

export default function AiAgentPage() {
  const [loading, setLoading] = useState(true)
  const [openclawEnabled, setOpenclawEnabled] = useState(false)
  const [openclawKey, setOpenclawKey] = useState("")
  const [hermesEnabled, setHermesEnabled] = useState(false)
  const [hermesKey, setHermesKey] = useState("")
  const [claudeCodeEnabled, setClaudeCodeEnabled] = useState(false)
  const [claudeCodeKey, setClaudeCodeKey] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data.openclawEnabled) setOpenclawEnabled(data.openclawEnabled === "true")
        if (data.openclawKey) setOpenclawKey(data.openclawKey)
        if (data.hermesEnabled) setHermesEnabled(data.hermesEnabled === "true")
        if (data.hermesKey) setHermesKey(data.hermesKey)
        if (data.claudeCodeEnabled) setClaudeCodeEnabled(data.claudeCodeEnabled === "true")
        if (data.claudeCodeKey) setClaudeCodeKey(data.claudeCodeKey)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function saveAgentSetting(key: string, value: string | boolean) {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { [key]: value } }),
      })
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <SettingsPageHeader title="AI & Agent" description="自动化调度与辅助 Agent 参数配置" />
      <div className="max-w-2xl space-y-3 animate-in fade-in-50 duration-150">
        <p className="text-[11.5px] text-muted-foreground/80 mb-3 leading-normal">配置 AI Agent 连接和自动化以激活更高级的代码辅助或视频生成指令</p>

        <div className="space-y-1">
          {/* Openclaw */}
          <div className="flex items-center justify-between py-2.5 border-b border-border/20">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground/85">Openclaw</div>
              <div className="text-[11px] text-muted-foreground/65 mt-0.5">多平台 AI Agent 调度与控制引擎</div>
            </div>
            <Toggle checked={openclawEnabled} onChange={(v) => { setOpenclawEnabled(v); saveAgentSetting("openclawEnabled", v) }} />
          </div>
          {openclawEnabled && (
            <div className="pl-3 border-l-2 border-border/45 my-1">
              <SettingRow label="API Key" description="Openclaw 服务连接密钥">
                <Input type="password" value={openclawKey} onChange={(e) => { setOpenclawKey(e.target.value) }} onBlur={() => saveAgentSetting("openclawKey", openclawKey)} placeholder="sk-..." className="w-[240px] h-8 text-[12px]" />
              </SettingRow>
            </div>
          )}

          {/* Hermes Agent */}
          <div className="flex items-center justify-between py-2.5 border-b border-border/20">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground/85">Hermes Agent</div>
              <div className="text-[11px] text-muted-foreground/65 mt-0.5">智能对话与工作流串联 Agent</div>
            </div>
            <Toggle checked={hermesEnabled} onChange={(v) => { setHermesEnabled(v); saveAgentSetting("hermesEnabled", v) }} />
          </div>
          {hermesEnabled && (
            <div className="pl-3 border-l-2 border-border/45 my-1">
              <SettingRow label="API Key" description="Hermes Agent 连接密钥">
                <Input type="password" value={hermesKey} onChange={(e) => { setHermesKey(e.target.value) }} onBlur={() => saveAgentSetting("hermesKey", hermesKey)} placeholder="sk-..." className="w-[240px] h-8 text-[12px]" />
              </SettingRow>
            </div>
          )}

          {/* Claude Code */}
          <div className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground/85">Claude Code</div>
              <div className="text-[11px] text-muted-foreground/65 mt-0.5">Anthropic 开发级交互式辅助 Agent</div>
            </div>
            <Toggle checked={claudeCodeEnabled} onChange={(v) => { setClaudeCodeEnabled(v); saveAgentSetting("claudeCodeEnabled", v) }} />
          </div>
          {claudeCodeEnabled && (
            <div className="pl-3 border-l-2 border-border/45 my-1">
              <SettingRow label="API Key" description="Claude Code 连接密钥">
                <Input type="password" value={claudeCodeKey} onChange={(e) => { setClaudeCodeKey(e.target.value) }} onBlur={() => saveAgentSetting("claudeCodeKey", claudeCodeKey)} placeholder="sk-..." className="w-[240px] h-8 text-[12px]" />
              </SettingRow>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
