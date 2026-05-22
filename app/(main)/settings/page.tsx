"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { onSettingsNav } from "@/lib/settings-events"
import {
  Loader2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Globe,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const PROVIDERS: Record<string, { name: string; baseUrl: string; defaultModel: string }> = {
  minimax: { name: "MiniMax", baseUrl: "https://api.minimaxi.com/v1", defaultModel: "MiniMax-M2.7" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-v4-flash" },
}

const EXPORT_FORMATS = ["JSON", "CSV", "TXT"]
const THEME_OPTIONS = ["浅色", "深色", "跟随系统"]
const LANG_OPTIONS = ["自动检测", "中文", "English", "日本語", "한국어"]
const DENSITY_OPTIONS = ["舒适", "紧凑"]

type SectionId = "profile" | "preferences" | "llm" | "ai" | "storage" | "integrations" | "help" | "updates"

/* -------------------------------------------------------------------------- */
/*  Dropdown                                                                  */
/* -------------------------------------------------------------------------- */

function Dropdown({
  value,
  options,
  width,
  onChange,
}: {
  value: string
  options: readonly string[]
  width?: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center justify-between rounded-md border border-input bg-card px-3 py-1.5 text-sm",
          "hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        style={{ width: width || "140px" }}
      >
        <span>{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-full min-w-[120px] rounded-md border bg-card py-1 shadow-lg animate-in fade-in zoom-in-95 origin-top-right">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors",
                opt === value && "font-medium"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Toggle                                                                    */
/* -------------------------------------------------------------------------- */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted-foreground/25"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Setting Row                                                               */
/* -------------------------------------------------------------------------- */

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-sm text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Status Banner                                                             */
/* -------------------------------------------------------------------------- */

function StatusBanner({ type, text, onDismiss }: { type: "success" | "error"; text: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!text) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [text, onDismiss])

  if (!text) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top-2",
        type === "success"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      )}
    >
      {type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {text}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Settings Page                                                             */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile")
  const [loading, setLoading] = useState(true)

  // Preferences
  const [theme, setTheme] = useState("跟随系统")
  const [transcribeLang, setTranscribeLang] = useState("自动检测")
  const [uiDensity, setUiDensity] = useState("舒适")

  // LLM
  const [llmProvider, setLlmProvider] = useState("minimax")
  const [llmModel, setLlmModel] = useState("")
  const [llmApiKey, setLlmApiKey] = useState("")

  // Updates
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "up-to-date">("idle")

  // AI & Agent
  const [openclawEnabled, setOpenclawEnabled] = useState(false)
  const [openclawKey, setOpenclawKey] = useState("")
  const [hermesEnabled, setHermesEnabled] = useState(false)
  const [hermesKey, setHermesKey] = useState("")
  const [claudeCodeEnabled, setClaudeCodeEnabled] = useState(false)
  const [claudeCodeKey, setClaudeCodeKey] = useState("")

  // Storage
  const [dbPath, setDbPath] = useState("./data/video-analysis.db")
  const [exportPath, setExportPath] = useState("./exports")
  const [exportFormat, setExportFormat] = useState("JSON")
  const [ytdlpPath, setYtdlpPath] = useState("yt-dlp")
  const [ffmpegPath, setFfmpegPath] = useState("ffmpeg")
  const [cacheDays, setCacheDays] = useState(30)

  type SaveStatus = { status: "idle" | "saving"; message: { type: "success" | "error"; text: string } | null }
  const [prefSave, setPrefSave] = useState<SaveStatus>({ status: "idle", message: null })
  const [llmSave, setLlmSave] = useState<SaveStatus>({ status: "idle", message: null })
  const [storageSave, setStorageSave] = useState<SaveStatus>({ status: "idle", message: null })

  /* ---- load ---- */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (!res.ok) return

        if (data.dbPath) setDbPath(data.dbPath)
        if (data.exportPath) setExportPath(data.exportPath)
        if (data.exportFormat) setExportFormat(data.exportFormat.toUpperCase())
        if (data.llmProvider) {
          setLlmProvider(data.llmProvider)
          setLlmModel(data.llmModel || PROVIDERS[data.llmProvider]?.defaultModel || "")
          setLlmApiKey(data.llmApiKey || "")
        } else {
          setLlmModel(PROVIDERS.minimax.defaultModel)
        }
        if (data.ytdlpPath) setYtdlpPath(data.ytdlpPath)
        if (data.ffmpegPath) setFfmpegPath(data.ffmpegPath)
        if (data.theme) setTheme(data.theme)
        if (data.transcribeLang) setTranscribeLang(data.transcribeLang)
        if (data.uiDensity) setUiDensity(data.uiDensity)
        if (data.openclawEnabled) setOpenclawEnabled(data.openclawEnabled === "true")
        if (data.openclawKey) setOpenclawKey(data.openclawKey)
        if (data.hermesEnabled) setHermesEnabled(data.hermesEnabled === "true")
        if (data.hermesKey) setHermesKey(data.hermesKey)
        if (data.claudeCodeEnabled) setClaudeCodeEnabled(data.claudeCodeEnabled === "true")
        if (data.claudeCodeKey) setClaudeCodeKey(data.claudeCodeKey)
        if (data.cacheDays) setCacheDays(Number(data.cacheDays))
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  /* ---- listen to sidebar nav events ---- */
  useEffect(() => onSettingsNav((id) => setActiveSection(id as SectionId)), [])

  /* ---- helpers ---- */
  const saveSettings = useCallback(
    async (entries: Record<string, string | number | boolean>, setSave: (v: SaveStatus) => void) => {
      setSave({ status: "saving", message: null })
      try {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: entries }),
        })
        const data = await res.json()
        setSave({
          status: "idle",
          message: res.ok
            ? { type: "success", text: "设置已保存" }
            : { type: "error", text: data.error || "保存失败" },
        })
      } catch (e) {
        setSave({ status: "idle", message: { type: "error", text: e instanceof Error ? e.message : "保存失败" } })
      }
    },
    []
  )

  const clearMessage = useCallback(
    (setSave: React.Dispatch<React.SetStateAction<SaveStatus>>) => setSave((prev) => ({ ...prev, message: null })),
    []
  )

  /* ---- handlers ---- */
  const handleSavePref = () => saveSettings({ theme, transcribeLang, uiDensity }, setPrefSave)

  const handleSaveLlm = async () => {
    if (!llmApiKey || !llmModel) {
      setLlmSave({ status: "idle", message: { type: "error", text: "请填写 API Key 和模型名称" } })
      return
    }
    setLlmSave({ status: "saving", message: null })
    try {
      const provider = Object.entries(PROVIDERS).find(([, v]) => v.name === llmProvider)
      const testRes = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: provider?.[1]?.baseUrl || PROVIDERS.minimax.baseUrl, apiKey: llmApiKey, model: llmModel }),
      })
      const testData = await testRes.json()
      if (!testRes.ok) {
        setLlmSave({ status: "idle", message: { type: "error", text: testData.error || "API 连接失败" } })
        return
      }
    } catch {
      setLlmSave({ status: "idle", message: { type: "error", text: "网络错误，无法测试连接" } })
      return
    }
    await saveSettings({ llmProvider, llmApiKey, llmModel }, setLlmSave)
  }

  const saveAgentSetting = useCallback(
    (key: string, value: string | boolean) => {
      saveSettings({ [key]: value }, () => {})
    },
    [saveSettings]
  )

  const handleSaveStorage = () => saveSettings({ dbPath, exportPath, exportFormat, ytdlpPath, ffmpegPath, cacheDays }, setStorageSave)

  /* ---- section titles ---- */
  const sectionTitles: Record<SectionId, string> = {
    profile: "个人信息",
    preferences: "偏好设置",
    llm: "LLM API",
    ai: "AI & Agent",
    storage: "存储配置",
    integrations: "集成",
    help: "帮助",
    updates: "更新",
  }

  /* ---- render ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-card rounded-l-xl ring-1 ring-border/40">
      <div className="max-w-[640px] mx-auto pt-16 pb-24 px-8">
          <h1 className="text-2xl font-semibold mb-8">{sectionTitles[activeSection]}</h1>

          {/* ---- Profile ---- */}
          {activeSection === "profile" && (
            <section>
              <div className="flex items-center gap-4 mb-8">
                <Avatar size="lg" className="size-14">
                  <AvatarFallback className="text-lg font-medium">A</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">admin</h2>
                  <p className="text-sm text-muted-foreground">admin@example.com</p>
                </div>
              </div>
              <div className="space-y-0.5">
                <SettingRow label="用户名" description="您的登录账号">
                  <Input value="admin" disabled className="w-[220px]" />
                </SettingRow>
                <SettingRow label="邮箱" description="用于接收通知和报告">
                  <Input value="admin@example.com" disabled className="w-[220px]" />
                </SettingRow>
              </div>
            </section>
          )}

          {/* ---- Preferences ---- */}
          {activeSection === "preferences" && (
            <section>
              <div className="space-y-0.5">
                <SettingRow label="主题" description="界面配色方案">
                  <Dropdown value={theme} options={THEME_OPTIONS} width="140px" onChange={(v) => { setTheme(v); clearMessage(setPrefSave) }} />
                </SettingRow>
                <SettingRow label="转写默认语言" description="视频语音转文字的默认目标语言">
                  <Dropdown value={transcribeLang} options={LANG_OPTIONS} width="140px" onChange={(v) => { setTranscribeLang(v); clearMessage(setPrefSave) }} />
                </SettingRow>
                <SettingRow label="UI 密度" description="控制界面信息密度与间距">
                  <Dropdown value={uiDensity} options={DENSITY_OPTIONS} width="100px" onChange={(v) => { setUiDensity(v); clearMessage(setPrefSave) }} />
                </SettingRow>
              </div>
              <div className="flex items-center justify-between mt-8 pt-4">
                <StatusBanner type={prefSave.message?.type ?? "success"} text={prefSave.message?.text ?? ""} onDismiss={() => clearMessage(setPrefSave)} />
                <Button onClick={handleSavePref} disabled={prefSave.status === "saving"} size="sm" className="ml-auto">
                  {prefSave.status === "saving" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  保存
                </Button>
              </div>
            </section>
          )}

          {/* ---- LLM ---- */}
          {activeSection === "llm" && (
            <section>
              <div className="space-y-0.5">
                <SettingRow label="API 提供商" description="选择您使用的 AI 服务提供商">
                  <Dropdown
                    value={PROVIDERS[llmProvider]?.name || "MiniMax"}
                    options={Object.values(PROVIDERS).map((p) => p.name)}
                    width="140px"
                    onChange={(v) => {
                      const key = Object.entries(PROVIDERS).find(([, p]) => p.name === v)?.[0] || "minimax"
                      setLlmProvider(key); setLlmModel(PROVIDERS[key].defaultModel); clearMessage(setLlmSave)
                    }}
                  />
                </SettingRow>
                <SettingRow label="模型名称" description="完整的模型标识符">
                  <Input value={llmModel} onChange={(e) => { setLlmModel(e.target.value); clearMessage(setLlmSave) }} placeholder="输入模型名称" className="w-[220px]" />
                </SettingRow>
                <SettingRow label="API Key" description="您的 API 密钥，将安全保存在本地数据库">
                  <Input type="password" value={llmApiKey} onChange={(e) => { setLlmApiKey(e.target.value); clearMessage(setLlmSave) }} placeholder="输入您的 API Key" className="w-[260px]" />
                </SettingRow>
              </div>
              <div className="flex items-center justify-between mt-8 pt-4">
                <StatusBanner type={llmSave.message?.type ?? "success"} text={llmSave.message?.text ?? ""} onDismiss={() => clearMessage(setLlmSave)} />
                <Button onClick={handleSaveLlm} disabled={llmSave.status === "saving"} size="sm" className="ml-auto">
                  {llmSave.status === "saving" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  测试并保存
                </Button>
              </div>
            </section>
          )}

          {/* ---- AI & Agent ---- */}
          {activeSection === "ai" && (
            <section>
              <p className="text-sm text-muted-foreground mb-6">配置 AI Agent 连接和自动化</p>

              {/* Openclaw */}
              <div className="space-y-0.5">
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between gap-8 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Openclaw</div>
                    <div className="text-sm text-muted-foreground mt-0.5">多平台 AI Agent 调度引擎</div>
                  </div>
                  <Toggle checked={openclawEnabled} onChange={(v) => { setOpenclawEnabled(v); saveAgentSetting("openclawEnabled", v) }} />
                </div>
                {openclawEnabled && (
                  <SettingRow label="API Key" description="Openclaw 服务连接密钥">
                    <Input type="password" value={openclawKey} onChange={(e) => { setOpenclawKey(e.target.value) }} placeholder="sk-..." className="w-[260px]" />
                  </SettingRow>
                )}

                {/* Hermes Agent */}
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between gap-8 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Hermes Agent</div>
                    <div className="text-sm text-muted-foreground mt-0.5">智能对话与任务编排 Agent</div>
                  </div>
                  <Toggle checked={hermesEnabled} onChange={(v) => { setHermesEnabled(v); saveAgentSetting("hermesEnabled", v) }} />
                </div>
                {hermesEnabled && (
                  <SettingRow label="API Key" description="Hermes Agent 连接密钥">
                    <Input type="password" value={hermesKey} onChange={(e) => { setHermesKey(e.target.value) }} placeholder="sk-..." className="w-[260px]" />
                  </SettingRow>
                )}

                {/* Claude Code */}
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between gap-8 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Claude Code</div>
                    <div className="text-sm text-muted-foreground mt-0.5">Anthropic 代码辅助 Agent</div>
                  </div>
                  <Toggle checked={claudeCodeEnabled} onChange={(v) => { setClaudeCodeEnabled(v); saveAgentSetting("claudeCodeEnabled", v) }} />
                </div>
                {claudeCodeEnabled && (
                  <SettingRow label="API Key" description="Claude Code 连接密钥">
                    <Input type="password" value={claudeCodeKey} onChange={(e) => { setClaudeCodeKey(e.target.value) }} placeholder="sk-..." className="w-[260px]" />
                  </SettingRow>
                )}

              </div>

            </section>
          )}

          {/* ---- Storage ---- */}
          {activeSection === "storage" && (
            <section>
              <div className="space-y-0.5">
                <SettingRow label="数据库路径" description="SQLite 数据库文件的存储位置">
                  <Input value={dbPath} onChange={(e) => { setDbPath(e.target.value); clearMessage(setStorageSave) }} className="w-[220px]" />
                </SettingRow>
                <SettingRow label="导出路径" description="分析结果的默认导出目录">
                  <Input value={exportPath} onChange={(e) => { setExportPath(e.target.value); clearMessage(setStorageSave) }} className="w-[220px]" />
                </SettingRow>
                <SettingRow label="导出格式" description="分析报告和字幕的默认导出格式">
                  <Dropdown value={exportFormat} options={EXPORT_FORMATS} width="140px" onChange={(v) => { setExportFormat(v); clearMessage(setStorageSave) }} />
                </SettingRow>
                <div className="h-px bg-border/60 my-2" />
                <SettingRow label="yt-dlp 路径" description="yt-dlp 可执行文件路径或命令名">
                  <Input value={ytdlpPath} onChange={(e) => { setYtdlpPath(e.target.value); clearMessage(setStorageSave) }} className="w-[220px]" />
                </SettingRow>
                <SettingRow label="FFmpeg 路径" description="FFmpeg 可执行文件路径或命令名">
                  <Input value={ffmpegPath} onChange={(e) => { setFfmpegPath(e.target.value); clearMessage(setStorageSave) }} className="w-[220px]" />
                </SettingRow>
                <div className="h-px bg-border/60 my-2" />
                <SettingRow label="缓存保留天数" description={`已下载视频和音频的本地缓存保留 ${cacheDays} 天`}>
                  <div className="flex items-center gap-3 w-[180px]">
                    <input
                      type="range" min={1} max={90} step={1} value={cacheDays}
                      onChange={(e) => { setCacheDays(Number(e.target.value)); clearMessage(setStorageSave) }}
                      className={cn(
                        "h-1.5 w-full appearance-none rounded-full bg-muted accent-primary",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                        "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
                        "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer",
                        "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                      )}
                    />
                    <span className="w-8 text-right text-sm tabular-nums text-muted-foreground shrink-0">{cacheDays}d</span>
                  </div>
                </SettingRow>
              </div>
              <div className="flex items-center justify-between mt-8 pt-4">
                <StatusBanner type={storageSave.message?.type ?? "success"} text={storageSave.message?.text ?? ""} onDismiss={() => clearMessage(setStorageSave)} />
                <Button onClick={handleSaveStorage} disabled={storageSave.status === "saving"} size="sm" className="ml-auto">
                  {storageSave.status === "saving" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  保存
                </Button>
              </div>
            </section>
          )}

          {/* ---- Integrations ---- */}
          {activeSection === "integrations" && (
            <section>
              <p className="text-sm text-muted-foreground mb-6">连接第三方服务和工具</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">飞书</div>
                    <div className="text-sm text-muted-foreground mt-0.5">连接飞书进行消息通知和文档协作</div>
                  </div>
                  <Button variant="outline" size="sm">连接</Button>
                </div>
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">GitHub</div>
                    <div className="text-sm text-muted-foreground mt-0.5">同步代码仓库和 Issues</div>
                  </div>
                  <Button variant="outline" size="sm">连接</Button>
                </div>
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Slack</div>
                    <div className="text-sm text-muted-foreground mt-0.5">接收分析完成通知</div>
                  </div>
                  <Button variant="outline" size="sm">连接</Button>
                </div>
              </div>
            </section>
          )}

          {/* ---- Help ---- */}
          {activeSection === "help" && (
            <section>
              <div className="space-y-3">
                <a href="/help" className="flex items-center justify-between py-3 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">使用文档</div>
                    <div className="text-sm text-muted-foreground mt-0.5">了解如何使用视频分析工具的各项功能</div>
                  </div>
                  <span className="text-muted-foreground text-sm">→</span>
                </a>
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">快捷键</div>
                    <div className="text-sm text-muted-foreground mt-0.5">查看键盘快捷键列表</div>
                  </div>
                  <span className="text-muted-foreground text-sm">⌘K</span>
                </div>
                <div className="h-px bg-border/60" />
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">反馈与建议</div>
                    <div className="text-sm text-muted-foreground mt-0.5">提交问题或功能建议</div>
                  </div>
                  <span className="text-muted-foreground text-sm">→</span>
                </div>
              </div>
            </section>
          )}

          {/* ---- Updates ---- */}
          {activeSection === "updates" && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-sm font-medium">当前版本 v1.2.0</div>
                  <div className="text-sm text-muted-foreground mt-0.5">检查是否有新版本可用</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setUpdateStatus("checking")
                    setTimeout(() => setUpdateStatus("up-to-date"), 1200)
                  }}
                  disabled={updateStatus === "checking"}
                >
                  {updateStatus === "checking" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {updateStatus === "up-to-date" ? "已是最新" : updateStatus === "checking" ? "检查中..." : "检查更新"}
                </Button>
              </div>
              {updateStatus === "up-to-date" && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mb-4 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4" /> 已是最新版本
                </div>
              )}

              <div className="flex items-center gap-3 mb-8">
                <a
                  href="https://video-shancn.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="size-3.5" />
                  官网
                </a>
                <a
                  href="https://github.com/video-shancn/video-shancn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-sm font-medium">v1.2.0 — 设置页重构</div>
                    <div className="text-sm text-muted-foreground mt-0.5">全新 Linear 风格设置页面，侧边栏融入主导航</div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">2026-05-22</div>
                  </div>
                </div>
                <div className="h-px bg-border/60" />
                <div className="flex items-center gap-3">
                  <span className="flex size-2 shrink-0 rounded-full bg-muted-foreground/30" />
                  <div>
                    <div className="text-sm font-medium">v1.1.0 — 消息操作优化</div>
                    <div className="text-sm text-muted-foreground mt-0.5">复制、重新生成、编辑消息操作按钮</div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">2026-05-15</div>
                  </div>
                </div>
                <div className="h-px bg-border/60" />
                <div className="flex items-center gap-3">
                  <span className="flex size-2 shrink-0 rounded-full bg-muted-foreground/30" />
                  <div>
                    <div className="text-sm font-medium">v1.0.0 — 问答助手</div>
                    <div className="text-sm text-muted-foreground mt-0.5">DeepSeek 风格侧边栏、多会话管理</div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">2026-05-08</div>
                  </div>
                </div>
              </div>
            </section>
          )}
      </div>
    </div>
  )
}
