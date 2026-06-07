"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { Dropdown, SettingRow, StatusBanner } from "@/components/settings/settings-ui"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const EXPORT_FORMATS = ["JSON", "CSV", "TXT"]

export default function StoragePage() {
  const [loading, setLoading] = useState(true)
  const [dbPath, setDbPath] = useState("./data/video-analysis.db")
  const [exportPath, setExportPath] = useState("./exports")
  const [exportFormat, setExportFormat] = useState("JSON")
  const [ytdlpPath, setYtdlpPath] = useState("yt-dlp")
  const [ffmpegPath, setFfmpegPath] = useState("ffmpeg")
  const [cacheDays, setCacheDays] = useState(30)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data.dbPath) setDbPath(data.dbPath)
        if (data.exportPath) setExportPath(data.exportPath)
        if (data.exportFormat) setExportFormat(data.exportFormat.toUpperCase())
        if (data.ytdlpPath) setYtdlpPath(data.ytdlpPath)
        if (data.ffmpegPath) setFfmpegPath(data.ffmpegPath)
        if (data.cacheDays) setCacheDays(Number(data.cacheDays))
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
        body: JSON.stringify({ settings: { dbPath, exportPath, exportFormat, ytdlpPath, ffmpegPath, cacheDays } }),
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
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="存储配置" description="配置本地 SQLite 数据库及第三方工具的运行环境" />
        
        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">存储与依赖</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 px-5 py-1.5 shadow-xs">
            <SettingRow label="数据库路径" description="SQLite 数据库文件的存储位置">
              <Input value={dbPath} onChange={(e) => { setDbPath(e.target.value); setMessage(null) }} className="w-[200px] h-8 text-[12px]" />
            </SettingRow>
            <SettingRow label="导出路径" description="分析结果的默认导出目录">
              <Input value={exportPath} onChange={(e) => { setExportPath(e.target.value); setMessage(null) }} className="w-[200px] h-8 text-[12px]" />
            </SettingRow>
            <SettingRow label="导出格式" description="分析报告和字幕的默认导出格式">
              <Dropdown value={exportFormat} options={EXPORT_FORMATS} width="140px" onChange={(v) => { setExportFormat(v); setMessage(null) }} />
            </SettingRow>
            <SettingRow label="yt-dlp 路径" description="yt-dlp 可执行文件路径或系统命令">
              <Input value={ytdlpPath} onChange={(e) => { setYtdlpPath(e.target.value); setMessage(null) }} className="w-[200px] h-8 text-[12px]" />
            </SettingRow>
            <SettingRow label="FFmpeg 路径" description="FFmpeg 视频切片和处理工具路径">
              <Input value={ffmpegPath} onChange={(e) => { setFfmpegPath(e.target.value); setMessage(null) }} className="w-[200px] h-8 text-[12px]" />
            </SettingRow>
            <SettingRow label="缓存保留天数" description={`已下载视频和音频的本地缓存保留 ${cacheDays} 天`}>
              <div className="flex items-center gap-3.5 w-[180px]">
                <input
                  type="range" min={1} max={90} step={1} value={cacheDays}
                  onChange={(e) => { setCacheDays(Number(e.target.value)); setMessage(null) }}
                  className={cn(
                    "h-1.5 w-full appearance-none rounded-full bg-muted accent-primary cursor-pointer",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
                    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
                    "[&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:cursor-pointer",
                    "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                  )}
                />
                <span className="w-8 text-right text-[12px] tabular-nums font-semibold text-muted-foreground shrink-0">{cacheDays}d</span>
              </div>
            </SettingRow>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <StatusBanner type={message?.type ?? "success"} text={message?.text ?? ""} onDismiss={() => setMessage(null)} />
          <button onClick={handleSave} disabled={saving} className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            保存配置
          </button>
        </div>
      </div>
    </div>
  )
}
