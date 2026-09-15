"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { SettingRow, StatusBanner } from "@/components/settings/settings-ui"
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react"

// 服务端只返回「是否已配置 + 脱敏预览」，明文 Cookie 不会下发到浏览器。
// 因此输入框始终为空，用户重新粘贴才会覆盖已保存的值；留空表示不修改。
function maskPreview(value: string): string {
  if (!value) return ""
  if (value.length <= 10) return "********"
  return `${value.slice(0, 4)}********${value.slice(-4)}`
}

export default function CookiesPage() {
  const [loading, setLoading] = useState(true)
  const [bilibiliCookie, setBilibiliCookie] = useState("")
  const [youtubeCookie, setYoutubeCookie] = useState("")
  const [saved, setSaved] = useState({ bilibili: false, youtube: false })
  const [previews, setPreviews] = useState({ bilibili: "", youtube: "" })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showBilibili, setShowBilibili] = useState(false)
  const [showYoutube, setShowYoutube] = useState(false)
  // 记录最近一次已持久化的「输入框内容」，用于自动保存时跳过未变更的情况
  const lastSavedRef = useRef({ bilibili: "", youtube: "" })
  const loadedRef = useRef(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        const sec = data.__secrets || {}
        setSaved({
          bilibili: !!sec.bilibiliCookie?.set,
          youtube: !!sec.youtubeCookie?.set,
        })
        setPreviews({
          bilibili: sec.bilibiliCookie?.preview || "",
          youtube: sec.youtubeCookie?.preview || "",
        })
        lastSavedRef.current = { bilibili: "", youtube: "" }
      } catch { /* silent */ }
      finally {
        loadedRef.current = true
        setLoading(false)
      }
    }
    load()
  }, [])

  async function saveCookies(bili: string, yt: string, silent = false) {
    // 只提交用户实际粘贴过的项，避免用空值清掉另一端已保存的 Cookie
    const settings: Record<string, string> = {}
    if (bili) settings.bilibiliCookie = bili
    if (yt) settings.youtubeCookie = yt
    if (Object.keys(settings).length === 0) return true

    setSaving(true)
    if (!silent) setMessage(null)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      const data = await res.json()
      if (res.ok) {
        lastSavedRef.current = { bilibili: bili, youtube: yt }
        setSaved((prev) => ({
          bilibili: prev.bilibili || !!bili,
          youtube: prev.youtube || !!yt,
        }))
        setPreviews((prev) => ({
          bilibili: bili ? maskPreview(bili) : prev.bilibili,
          youtube: yt ? maskPreview(yt) : prev.youtube,
        }))
        if (!silent) setMessage({ type: "success", text: "Cookie 已保存" })
        return true
      } else {
        if (!silent) setMessage({ type: "error", text: data.error || "保存失败" })
        return false
      }
    } catch (e) {
      if (!silent) setMessage({ type: "error", text: e instanceof Error ? e.message : "保存失败" })
      return false
    } finally {
      setSaving(false)
    }
  }

  // 输入变化后自动保存（防抖 800ms），避免忘记点“保存”按钮
  useEffect(() => {
    if (!loadedRef.current) return
    const prev = lastSavedRef.current
    if (bilibiliCookie === prev.bilibili && youtubeCookie === prev.youtube) return
    const timer = setTimeout(() => {
      saveCookies(bilibiliCookie, youtubeCookie, true)
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilibiliCookie, youtubeCookie])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const renderCookieInput = (
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    setShow: (v: boolean) => void,
    placeholder: string
  ) => (
    <div className="relative w-[240px]">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => { onChange(e.target.value); setMessage(null) }}
        placeholder={placeholder}
        className="w-full h-8 text-[12px] pr-8"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        title={show ? "隐藏" : "显示"}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  )

  const hasSavedBilibili = saved.bilibili

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="Cookie 配置" description="配置解析和视频抓取的登录 Cookies 以支持更高清下载" />

        <form
          className="space-y-2.5"
          onSubmit={(e) => { e.preventDefault(); saveCookies(bilibiliCookie, youtubeCookie) }}
        >
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">站点 Cookie</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 px-5 py-1.5 shadow-xs">
            <SettingRow
              label="Bilibili Cookie"
              description="登录 bilibili.com 后从浏览器复制的 Cookie（需包含 SESSDATA），可解决 HTTP 412 风控拦截。已保存的值不会回显，重新粘贴可覆盖。"
            >
              <div className="flex items-center gap-2">
                {renderCookieInput(
                  bilibiliCookie,
                  setBilibiliCookie,
                  showBilibili,
                  setShowBilibili,
                  previews.bilibili ? `已保存 ${previews.bilibili}` : "粘贴 Bilibili Cookie"
                )}
                {hasSavedBilibili && !saving && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> 已保存
                  </span>
                )}
              </div>
            </SettingRow>
            <SettingRow label="YouTube Cookie" description="YouTube 加密视频和高码率下载所需的 Cookie。已保存的值不会回显，重新粘贴可覆盖。">
              <div className="flex items-center gap-2">
                {renderCookieInput(
                  youtubeCookie,
                  setYoutubeCookie,
                  showYoutube,
                  setShowYoutube,
                  previews.youtube ? `已保存 ${previews.youtube}` : "粘贴 YouTube Cookie"
                )}
                {saved.youtube && !saving && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> 已保存
                  </span>
                )}
              </div>
            </SettingRow>
          </div>

          <div className="flex items-center justify-between pt-2">
            <StatusBanner type={message?.type ?? "success"} text={message?.text ?? ""} onDismiss={() => setMessage(null)} />
            <button
              type="submit"
              disabled={saving}
              className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              保存 Cookie
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
