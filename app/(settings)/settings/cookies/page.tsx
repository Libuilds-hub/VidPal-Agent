"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { SettingRow, StatusBanner } from "@/components/settings/settings-ui"
import { Loader2 } from "lucide-react"

export default function CookiesPage() {
  const [loading, setLoading] = useState(true)
  const [bilibiliCookie, setBilibiliCookie] = useState("")
  const [youtubeCookie, setYoutubeCookie] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data.bilibiliCookie) setBilibiliCookie(data.bilibiliCookie)
        if (data.youtubeCookie) setYoutubeCookie(data.youtubeCookie)
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
        body: JSON.stringify({ settings: { bilibiliCookie, youtubeCookie } }),
      })
      const data = await res.json()
      setMessage(res.ok
        ? { type: "success", text: "Cookie 已保存" }
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
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="Cookie 配置" description="配置解析和视频抓取的登录 Cookies 以支持更高清下载" />
        
        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">站点 Cookie</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 px-5 py-1.5 shadow-xs">
            <SettingRow label="Bilibili Cookie" description="Bilibili 视频解析和下载所需的登录 Cookie">
              <Input
                type="password"
                value={bilibiliCookie}
                onChange={(e) => { setBilibiliCookie(e.target.value); setMessage(null) }}
                placeholder="粘贴 Bilibili Cookie"
                className="w-[240px] h-8 text-[12px]"
              />
            </SettingRow>
            <SettingRow label="YouTube Cookie" description="YouTube 加密视频和高码率下载所需的 Cookie">
              <Input
                type="password"
                value={youtubeCookie}
                onChange={(e) => { setYoutubeCookie(e.target.value); setMessage(null) }}
                placeholder="粘贴 YouTube Cookie"
                className="w-[240px] h-8 text-[12px]"
              />
            </SettingRow>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <StatusBanner type={message?.type ?? "success"} text={message?.text ?? ""} onDismiss={() => setMessage(null)} />
          <button onClick={handleSave} disabled={saving} className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            保存 Cookie
          </button>
        </div>
      </div>
    </div>
  )
}
