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
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="AI & Agent" description="自动化调度与辅助 Agent 参数配置" />
        
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pl-1">
            <h2 className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-wider select-none">AI 代理</h2>
            <span className="text-[10.5px] text-muted-foreground/60 leading-none select-none">配置 Agent 连接以激活高级功能</span>
          </div>
          
          <div className="rounded-xl border border-border/40 bg-card/45 px-5 py-1.5 shadow-xs divide-y divide-border/20">
            {/* Openclaw */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground">Openclaw</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-normal">多平台 AI Agent 调度与控制引擎</div>
                </div>
                <Toggle checked={openclawEnabled} onChange={(v) => { setOpenclawEnabled(v); saveAgentSetting("openclawEnabled", v) }} />
              </div>
              {openclawEnabled && (
                <div className="mt-3.5 pt-3.5 border-t border-dashed border-border/25">
                  <SettingRow label="API Key" description="Openclaw 服务连接密钥">
                    <Input type="password" value={openclawKey} onChange={(e) => { setOpenclawKey(e.target.value) }} onBlur={() => saveAgentSetting("openclawKey", openclawKey)} placeholder="sk-..." className="w-[240px] h-8 text-[12px]" />
                  </SettingRow>
                </div>
              )}
            </div>

            {/* Hermes Agent */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground">Hermes Agent</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-normal">智能对话与工作流串联 Agent</div>
                </div>
                <Toggle checked={hermesEnabled} onChange={(v) => { setHermesEnabled(v); saveAgentSetting("hermesEnabled", v) }} />
              </div>
              {hermesEnabled && (
                <div className="mt-3.5 pt-3.5 border-t border-dashed border-border/25">
                  <SettingRow label="API Key" description="Hermes Agent 连接密钥">
                    <Input type="password" value={hermesKey} onChange={(e) => { setHermesKey(e.target.value) }} onBlur={() => saveAgentSetting("hermesKey", hermesKey)} placeholder="sk-..." className="w-[240px] h-8 text-[12px]" />
                  </SettingRow>
                </div>
              )}
            </div>

            {/* Claude Code */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground">Claude Code</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-normal">Anthropic 开发级交互式辅助 Agent</div>
                </div>
                <Toggle checked={claudeCodeEnabled} onChange={(v) => { setClaudeCodeEnabled(v); saveAgentSetting("claudeCodeEnabled", v) }} />
              </div>
              {claudeCodeEnabled && (
                <div className="mt-3.5 pt-3.5 border-t border-dashed border-border/25">
                  <SettingRow label="API Key" description="Claude Code 连接密钥">
                    <Input type="password" value={claudeCodeKey} onChange={(e) => { setClaudeCodeKey(e.target.value) }} onBlur={() => saveAgentSetting("claudeCodeKey", claudeCodeKey)} placeholder="sk-..." className="w-[240px] h-8 text-[12px]" />
                  </SettingRow>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
