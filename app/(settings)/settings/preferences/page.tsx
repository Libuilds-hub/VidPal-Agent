"use client"

import { useState, useEffect } from "react"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { Dropdown, SettingRow, StatusBanner } from "@/components/settings/settings-ui"
import { Loader2 } from "lucide-react"

const THEME_OPTIONS = ["浅色", "深色", "跟随系统"]
const LANG_OPTIONS = ["自动检测", "中文", "English", "日本語", "한국어"]
const DENSITY_OPTIONS = ["舒适", "紧凑"]

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState("跟随系统")
  const [transcribeLang, setTranscribeLang] = useState("自动检测")
  const [uiDensity, setUiDensity] = useState("舒适")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data.theme) setTheme(data.theme)
        if (data.transcribeLang) setTranscribeLang(data.transcribeLang)
        if (data.uiDensity) setUiDensity(data.uiDensity)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { theme, transcribeLang, uiDensity } }),
      })
      const data = await res.json()
      setMessage(res.ok
        ? { type: "success", text: "设置已保存" }
        : { type: "error", text: data.error || "保存失败" })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "保存失败" })
    } finally {
      setSaving(false)
    }
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
      <SettingsPageHeader title="偏好设置" description="定制界面的个性化展现与转写默认值" />
      <div className="max-w-2xl space-y-4 animate-in fade-in-50 duration-150">
        <div className="space-y-1">
          <SettingRow label="主题" description="界面配色方案">
            <Dropdown value={theme} options={THEME_OPTIONS} width="140px" onChange={(v) => { setTheme(v); setMessage(null) }} />
          </SettingRow>
          <SettingRow label="转写默认语言" description="视频语音转文字的默认目标语言">
            <Dropdown value={transcribeLang} options={LANG_OPTIONS} width="140px" onChange={(v) => { setTranscribeLang(v); setMessage(null) }} />
          </SettingRow>
          <SettingRow label="UI 密度" description="控制界面信息密度与间距">
            <Dropdown value={uiDensity} options={DENSITY_OPTIONS} width="110px" onChange={(v) => { setUiDensity(v); setMessage(null) }} />
          </SettingRow>
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
          <StatusBanner type={message?.type ?? "success"} text={message?.text ?? ""} onDismiss={() => setMessage(null)} />
          <button onClick={handleSave} disabled={saving} className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
