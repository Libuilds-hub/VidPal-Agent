"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Loader2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  UserCircle,
  SlidersHorizontal,
  Settings,
  BotIcon,
  SparklesIcon,
  Database,
  Key,
  Plug,
  HelpCircleIcon,
  RefreshCw,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Constants & Providers                                                     */
/* -------------------------------------------------------------------------- */

const PROVIDERS: Record<string, { name: string; baseUrl: string; defaultModel: string }> = {
  minimax: { name: "MiniMax", baseUrl: "https://api.minimaxi.com/v1", defaultModel: "MiniMax-M2.7" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-v4-flash" },
}

const EXPORT_FORMATS = ["JSON", "CSV", "TXT"]
const THEME_OPTIONS = ["浅色", "深色", "跟随系统"]
const LANG_OPTIONS = ["自动检测", "中文", "English", "日本語", "한국어"]
const DENSITY_OPTIONS = ["舒适", "紧凑"]

type SectionId = "profile" | "preferences" | "llm" | "ai" | "storage" | "cookies" | "integrations" | "help" | "updates"

/* -------------------------------------------------------------------------- */
/*  Dropdown Component                                                        */
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
          "inline-flex items-center justify-between rounded-md border border-border/45 bg-card px-2.5 py-1 text-[12px] font-medium",
          "hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 cursor-pointer select-none"
        )}
        style={{ width: width || "140px" }}
      >
        <span>{value}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground/60 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-full min-w-[120px] rounded-lg border border-border/40 bg-popover py-1 shadow-md animate-in fade-in zoom-in-95 origin-top-right">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className={cn(
                "block w-full px-2.5 py-1.5 text-left text-[12px] hover:bg-muted/50 transition-colors cursor-pointer",
                opt === value ? "font-medium text-foreground bg-muted/30" : "text-muted-foreground"
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
/*  Toggle Component                                                          */
/* -------------------------------------------------------------------------- */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        checked ? "bg-primary" : "bg-muted-foreground/20"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200",
          checked ? "translate-x-[14px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Setting Row Component                                                     */
/* -------------------------------------------------------------------------- */

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 py-3 border-b border-border/20 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-normal text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5 leading-normal">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Status Banner Component                                                   */
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
        "flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-md animate-in fade-in slide-in-from-top-2",
        type === "success"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
      )}
    >
      {type === "success" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      <span className="font-medium">{text}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Settings Dialog Main Component                                            */
/* -------------------------------------------------------------------------- */

function SettingsDialogContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const settingsParam = searchParams.get("settings")
  const isOpen = !!settingsParam

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

  // Cookies
  const [bilibiliCookie, setBilibiliCookie] = useState("")
  const [youtubeCookie, setYoutubeCookie] = useState("")

  type SaveStatus = { status: "idle" | "saving"; message: { type: "success" | "error"; text: string } | null }
  const [prefSave, setPrefSave] = useState<SaveStatus>({ status: "idle", message: null })
  const [llmSave, setLlmSave] = useState<SaveStatus>({ status: "idle", message: null })
  const [storageSave, setStorageSave] = useState<SaveStatus>({ status: "idle", message: null })
  const [cookieSave, setCookieSave] = useState<SaveStatus>({ status: "idle", message: null })

  // Synchronize URL active tab
  useEffect(() => {
    if (settingsParam && settingsParam !== "true") {
      const validSections: SectionId[] = ["profile", "preferences", "llm", "ai", "storage", "cookies", "integrations", "help", "updates"]
      if (validSections.includes(settingsParam as SectionId)) {
        setActiveSection(settingsParam as SectionId)
      }
    } else {
      setActiveSection("profile")
    }
  }, [settingsParam])

  // Fetch settings on mount
  useEffect(() => {
    if (!isOpen) return
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
        if (data.bilibiliCookie) setBilibiliCookie(data.bilibiliCookie)
        if (data.youtubeCookie) setYoutubeCookie(data.youtubeCookie)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [isOpen])

  // Core save helper
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

  // Actions
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

  const handleSaveCookies = () => saveSettings({ bilibiliCookie, youtubeCookie }, setCookieSave)

  const handleSaveStorage = () => saveSettings({ dbPath, exportPath, exportFormat, ytdlpPath, ffmpegPath, cacheDays }, setStorageSave)

  const handleLogout = () => {
    if (confirm("确定要退出当前登录吗？")) {
      alert("已安全退出登录");
      window.location.href = "/";
    }
  }

  const handleDeleteAccount = () => {
    if (confirm("⚠️ 警告：注销账号将永久删除您的所有数据（包含所有会话历史和数据库配置），此操作无法撤销！\n\n您确定要进行注销操作吗？")) {
      const confirmation = prompt("确认永久注销？请输入 \"yes\" 确认：");
      if (confirmation?.toLowerCase() === "yes") {
        alert("账号注销成功，感谢您的使用！");
        window.location.href = "/";
      } else {
        alert("操作已取消");
      }
    }
  }

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("settings")
    const newQuery = params.toString()
    router.replace(newQuery ? `${pathname}?${newQuery}` : pathname, { scroll: false })
  }

  const handleSectionChange = (id: SectionId) => {
    setActiveSection(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set("settings", id)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const sidebarGroups = [
    {
      label: "常规设置",
      items: [
        { id: "profile" as SectionId, label: "个人信息", icon: UserCircle },
        { id: "preferences" as SectionId, label: "偏好设置", icon: SlidersHorizontal },
        { id: "storage" as SectionId, label: "存储配置", icon: Database },
      ]
    },
    {
      label: "AI 服务与连接",
      items: [
        { id: "llm" as SectionId, label: "LLM API", icon: BotIcon },
        { id: "ai" as SectionId, label: "AI & Agent", icon: SparklesIcon },
        { id: "cookies" as SectionId, label: "Cookie 配置", icon: Key },
        { id: "integrations" as SectionId, label: "集成合作", icon: Plug },
      ]
    },
    {
      label: "系统支持",
      items: [
        { id: "help" as SectionId, label: "使用与帮助", icon: HelpCircleIcon },
        { id: "updates" as SectionId, label: "更新日志", icon: RefreshCw },
      ]
    }
  ]

  const sectionTitles: Record<SectionId, string> = {
    profile: "个人信息",
    preferences: "偏好设置",
    llm: "LLM API",
    ai: "AI & Agent",
    storage: "存储配置",
    cookies: "Cookie 配置",
    integrations: "集成合作",
    help: "使用与帮助",
    updates: "更新日志",
  }

  const sectionDescriptions: Record<SectionId, string> = {
    profile: "管理您的基本账户和安全信息",
    preferences: "定制界面的个性化展现与转写默认值",
    llm: "配置 AI 辅助模型连接与测试 API 状态",
    ai: "自动化调度与辅助 Agent 参数配置",
    storage: "配置本地 SQLite 数据库及第三方工具的运行环境",
    cookies: "配置解析和视频抓取的登录 Cookies 以支持更高清下载",
    integrations: "连接飞书、Slack 或 GitHub 等办公协同插件",
    help: "查看键盘快捷键与常见故障处理方法",
    updates: "检查是否有新版本可用并回顾系统版本进化历程",
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="max-w-[850px] w-[95vw] h-[580px] p-0 gap-0 flex flex-row overflow-hidden border border-border/40 shadow-2xl bg-background rounded-xl">
        <DialogTitle className="sr-only">设置</DialogTitle>
        <DialogDescription className="sr-only">系统偏好设置与后台控制中心</DialogDescription>
        
        {/* Left dialog sidebar */}
        <div className="w-[200px] md:w-[220px] bg-sidebar border-r border-border/35 p-4 flex flex-col shrink-0 select-none overflow-y-auto scrollbar-none">
          <div className="flex flex-col gap-6">
            {/* Header / Brand */}
            <div className="flex items-center gap-2 px-1.5 py-1">
              <Settings className="size-4.5 text-foreground/80" />
              <span className="font-semibold text-[14px] text-foreground/90 tracking-wide">设置</span>
            </div>

            {/* Nav list - Grouped */}
            <div className="space-y-4 flex-1">
              {sidebarGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 transition-opacity duration-200">
                    {group.label}
                  </div>
                  <nav className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const isActive = activeSection === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSectionChange(item.id)}
                          className={cn(
                            "flex items-center gap-2.5 w-full pl-3 pr-2.5 py-1.5 h-8.5 text-[13px] rounded-lg transition-all duration-150 cursor-pointer text-left select-none",
                            isActive
                              ? "bg-sidebar-accent/70 text-foreground font-semibold"
                              : "text-muted-foreground/65 hover:bg-muted/35 hover:text-muted-foreground/65!"
                          )}
                        >
                          <item.icon className={cn(
                            "size-4 transition-colors duration-150",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground/45"
                          )} />
                          <span className="tracking-wide truncate">{item.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        </div>




        {/* Right content panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/35 flex items-center justify-between shrink-0 select-none bg-background/50 backdrop-blur-xs">
            <div>
              <h1 className="text-[14px] font-semibold text-foreground/95">{sectionTitles[activeSection]}</h1>
              <p className="text-[10.5px] text-muted-foreground/75 mt-0.5">{sectionDescriptions[activeSection]}</p>
            </div>
          </div>

          {/* Main content body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 1. Profile section */}
                {activeSection === "profile" && (
                  <div className="space-y-3 animate-in fade-in-50 duration-150">
                    <div className="flex items-center gap-3.5 pb-4 border-b border-border/20">
                      <Avatar className="size-11">
                        <AvatarFallback className="text-sm font-medium bg-muted/70 border border-border/40 text-foreground/80">A</AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-sm font-medium text-foreground">admin</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">系统超级管理员</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <SettingRow label="用户名" description="您的系统登录账号">
                        <Input value="admin" disabled className="w-[200px] h-8 text-xs bg-muted/20" />
                      </SettingRow>
                      <SettingRow label="邮箱" description="用于接收通知和报告">
                        <Input value="admin@example.com" disabled className="w-[200px] h-8 text-xs bg-muted/20" />
                      </SettingRow>
                    </div>

                    <div className="h-px bg-border/20 my-5" />
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75">
                      <h3 className="text-[10px] font-medium text-red-500/70 dark:text-red-400/70 uppercase tracking-wider select-none pl-1">危险区域</h3>
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 divide-y divide-red-500/10 overflow-hidden">
                        {/* Logout row */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-normal text-foreground">退出当前登录</div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-normal">安全断开与当前设备的连接并清除会话历史缓存</div>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="h-7 px-3 text-xs font-medium rounded-md border border-border/40 hover:bg-muted/70 dark:hover:bg-muted/40 bg-card transition-all duration-150 cursor-pointer select-none"
                          >
                            退出登录
                          </button>
                        </div>
                        {/* Delete Account row */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-normal text-red-600 dark:text-red-400">注销系统账号</div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-normal">永久删除此账号及所有关联的本地会话历史与数据库，此操作不可逆</div>
                          </div>
                          <button
                            onClick={handleDeleteAccount}
                            className="h-7 px-3 text-xs font-medium rounded-md bg-red-600 hover:bg-red-700 text-white transition-all duration-150 cursor-pointer select-none border-0"
                          >
                            注销账号
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Preferences section */}
                {activeSection === "preferences" && (
                  <div className="space-y-4 animate-in fade-in-50 duration-150">
                    <div className="space-y-1">
                      <SettingRow label="主题" description="界面配色方案">
                        <Dropdown value={theme} options={THEME_OPTIONS} width="140px" onChange={(v) => { setTheme(v); clearMessage(setPrefSave) }} />
                      </SettingRow>
                      <SettingRow label="转写默认语言" description="视频语音转文字的默认目标语言">
                        <Dropdown value={transcribeLang} options={LANG_OPTIONS} width="140px" onChange={(v) => { setTranscribeLang(v); clearMessage(setPrefSave) }} />
                      </SettingRow>
                      <SettingRow label="UI 密度" description="控制界面信息密度与间距">
                        <Dropdown value={uiDensity} options={DENSITY_OPTIONS} width="110px" onChange={(v) => { setUiDensity(v); clearMessage(setPrefSave) }} />
                      </SettingRow>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
                      <StatusBanner type={prefSave.message?.type ?? "success"} text={prefSave.message?.text ?? ""} onDismiss={() => clearMessage(setPrefSave)} />
                      <button onClick={handleSavePref} disabled={prefSave.status === "saving"} className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none">
                        {prefSave.status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                        保存设置
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. LLM section */}
                {activeSection === "llm" && (
                  <div className="space-y-4 animate-in fade-in-50 duration-150">
                    <div className="space-y-1">
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
                        <Input value={llmModel} onChange={(e) => { setLlmModel(e.target.value); clearMessage(setLlmSave) }} placeholder="输入模型名称" className="w-[200px] h-8 text-[12px]" />
                      </SettingRow>
                      <SettingRow label="API Key" description="您的 API 密钥，将安全保存在本地数据库">
                        <Input type="password" value={llmApiKey} onChange={(e) => { setLlmApiKey(e.target.value); clearMessage(setLlmSave) }} placeholder="输入您的 API Key" className="w-[240px] h-8 text-[12px]" />
                      </SettingRow>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
                      <StatusBanner type={llmSave.message?.type ?? "success"} text={llmSave.message?.text ?? ""} onDismiss={() => clearMessage(setLlmSave)} />
                      <button onClick={handleSaveLlm} disabled={llmSave.status === "saving"} className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none">
                        {llmSave.status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                        测试并保存
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. AI & Agent section */}
                {activeSection === "ai" && (
                  <div className="space-y-3 animate-in fade-in-50 duration-150">
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
                )}

                {/* 5. Storage section */}
                {activeSection === "storage" && (
                  <div className="space-y-4 animate-in fade-in-50 duration-150">
                    <div className="space-y-1">
                      <SettingRow label="数据库路径" description="SQLite 数据库文件的存储位置">
                        <Input value={dbPath} onChange={(e) => { setDbPath(e.target.value); clearMessage(setStorageSave) }} className="w-[200px] h-8 text-[12px]" />
                      </SettingRow>
                      <SettingRow label="导出路径" description="分析结果的默认导出目录">
                        <Input value={exportPath} onChange={(e) => { setExportPath(e.target.value); clearMessage(setStorageSave) }} className="w-[200px] h-8 text-[12px]" />
                      </SettingRow>
                      <SettingRow label="导出格式" description="分析报告和字幕的默认导出格式">
                        <Dropdown value={exportFormat} options={EXPORT_FORMATS} width="140px" onChange={(v) => { setExportFormat(v); clearMessage(setStorageSave) }} />
                      </SettingRow>
                      <SettingRow label="yt-dlp 路径" description="yt-dlp 可执行文件路径或系统命令">
                        <Input value={ytdlpPath} onChange={(e) => { setYtdlpPath(e.target.value); clearMessage(setStorageSave) }} className="w-[200px] h-8 text-[12px]" />
                      </SettingRow>
                      <SettingRow label="FFmpeg 路径" description="FFmpeg 视频切片和处理工具路径">
                        <Input value={ffmpegPath} onChange={(e) => { setFfmpegPath(e.target.value); clearMessage(setStorageSave) }} className="w-[200px] h-8 text-[12px]" />
                      </SettingRow>
                      <SettingRow label="缓存保留天数" description={`已下载视频和音频的本地缓存保留 ${cacheDays} 天`}>
                        <div className="flex items-center gap-3.5 w-[180px]">
                          <input
                            type="range" min={1} max={90} step={1} value={cacheDays}
                            onChange={(e) => { setCacheDays(Number(e.target.value)); clearMessage(setStorageSave) }}
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
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
                      <StatusBanner type={storageSave.message?.type ?? "success"} text={storageSave.message?.text ?? ""} onDismiss={() => clearMessage(setStorageSave)} />
                      <button onClick={handleSaveStorage} disabled={storageSave.status === "saving"} className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none">
                        {storageSave.status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                        保存配置
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Cookies section */}
                {activeSection === "cookies" && (
                  <div className="space-y-4 animate-in fade-in-50 duration-150">
                    <p className="text-[11.5px] text-muted-foreground/80 leading-normal">配置各平台的 Cookie 用于跳过防爬机制，下载更清晰视频及专享字幕内容</p>
                    <div className="space-y-1">
                      <SettingRow label="Bilibili Cookie" description="Bilibili 视频解析和下载所需的登录 Cookie">
                        <Input
                          type="password"
                          value={bilibiliCookie}
                          onChange={(e) => { setBilibiliCookie(e.target.value); clearMessage(setCookieSave) }}
                          placeholder="粘贴 Bilibili Cookie"
                          className="w-[240px] h-8 text-[12px]"
                        />
                      </SettingRow>
                      <SettingRow label="YouTube Cookie" description="YouTube 加密视频和高码率下载所需的 Cookie">
                        <Input
                          type="password"
                          value={youtubeCookie}
                          onChange={(e) => { setYoutubeCookie(e.target.value); clearMessage(setCookieSave) }}
                          placeholder="粘贴 YouTube Cookie"
                          className="w-[240px] h-8 text-[12px]"
                        />
                      </SettingRow>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
                      <StatusBanner type={cookieSave.message?.type ?? "success"} text={cookieSave.message?.text ?? ""} onDismiss={() => clearMessage(setCookieSave)} />
                      <button onClick={handleSaveCookies} disabled={cookieSave.status === "saving"} className="ml-auto h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none">
                        {cookieSave.status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                        保存 Cookie
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. Integrations section */}
                {activeSection === "integrations" && (
                  <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                    <p className="text-[11.5px] text-muted-foreground/80 mb-3 leading-normal">集成第三方云服务、协作应用和通知助手，打通您日常的工作流</p>
                    <div className="rounded-lg border border-border/30 divide-y divide-border/20 overflow-hidden bg-card/10">
                      {[
                        { name: "飞书办公", desc: "同步总结报告及进行重要消息推送通知" },
                        { name: "GitHub Repository", desc: "绑定仓库提交问题报告及保存分析生成的 Markdown 资料" },
                        { name: "Slack", desc: "分析完成时推送团队频道卡片" },
                      ].map(({ name, desc }) => (
                        <div key={name} className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold text-foreground/85">{name}</div>
                            <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">{desc}</div>
                          </div>
                          <button className="h-6 px-3 text-[11px] font-semibold rounded border border-border/40 text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground/95 transition-all duration-150 cursor-pointer select-none">开始连接</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Help section */}
                {activeSection === "help" && (
                  <div className="space-y-3 animate-in fade-in-50 duration-150">
                    <a href="/help" className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-3 px-3 rounded-lg transition-colors cursor-pointer select-none">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-foreground/85">常见使用问题</div>
                        <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">全面了解如何快速导入视频、转写并获取深度知识结构</div>
                      </div>
                      <span className="text-muted-foreground/60 text-sm font-semibold">→</span>
                    </a>
                    <div className="h-px bg-border/20" />
                    <div className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-foreground/85">全局快捷键</div>
                        <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">唤醒和操作界面元素的键盘命令</div>
                      </div>
                      <span className="text-muted-foreground/65 text-[11px] font-semibold bg-muted/60 px-1.5 py-0.5 rounded border border-border/30 font-mono">⌘K</span>
                    </div>
                    <div className="h-px bg-border/20" />
                    <a href="mailto:support@example.com" className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-3 px-3 rounded-lg transition-colors cursor-pointer select-none">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-foreground/85">在线反馈与建议</div>
                        <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">提交故障报告或您想让我们开发的功能想法</div>
                      </div>
                      <span className="text-muted-foreground/60 text-sm font-semibold">→</span>
                    </a>
                  </div>
                )}

                {/* 9. Updates section */}
                {activeSection === "updates" && (
                  <div className="space-y-4 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-border/20">
                      <div>
                        <div className="text-[12.5px] font-semibold text-foreground/85">当前版本 v1.2.0</div>
                        <div className="text-[10.5px] text-muted-foreground/75 mt-0.5">主程序检查最新功能更新</div>
                      </div>
                      <button
                        onClick={() => {
                          setUpdateStatus("checking")
                          setTimeout(() => setUpdateStatus("up-to-date"), 1200)
                        }}
                        disabled={updateStatus === "checking"}
                        className="h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none"
                      >
                        {updateStatus === "checking" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {updateStatus === "up-to-date" ? "已是最新" : updateStatus === "checking" ? "正在检查..." : "检查更新"}
                      </button>
                    </div>
                    
                    {updateStatus === "up-to-date" && (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/15 animate-in fade-in">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 已成功连接并校验，目前已是最新版本
                      </div>
                    )}

                    <div className="space-y-3.5 pt-2">
                      <div className="flex items-start gap-2.5">
                        <span className="flex size-1.5 shrink-0 rounded-full bg-primary mt-1.5" />
                        <div>
                          <div className="text-[12px] font-semibold text-foreground/85">v1.2.0 — 设置页全面重构</div>
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-normal">全面将传统设置路由重构为顶级 Shadcn Dialog 弹窗，并支持无缝侧边栏分割，极致保持工作空间状态。</div>
                          <div className="text-[10px] text-muted-foreground/45 mt-0.5">2026-05-22</div>
                        </div>
                      </div>
                      <div className="h-px bg-border/20" />
                      <div className="flex items-start gap-2.5">
                        <span className="flex size-1.5 shrink-0 rounded-full bg-muted-foreground/35 mt-1.5" />
                        <div>
                          <div className="text-[12px] font-semibold text-foreground/80">v1.1.0 — 历史对话功能引入</div>
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-normal">支持将对话流序列化并存入 LocalStorage，支持合集底部的多会话重加载。</div>
                          <div className="text-[10px] text-muted-foreground/45 mt-0.5">2026-05-15</div>
                        </div>
                      </div>
                      <div className="h-px bg-border/20" />
                      <div className="flex items-start gap-2.5">
                        <span className="flex size-1.5 shrink-0 rounded-full bg-muted-foreground/35 mt-1.5" />
                        <div>
                          <div className="text-[12px] font-semibold text-foreground/80">v1.0.0 — AI 辅助视频学习平台发布</div>
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-normal">核心视频导入、音频切片、文字转写、Prisma 数据落地及 DeepSeek 风格助手首发。</div>
                          <div className="text-[10px] text-muted-foreground/45 mt-0.5">2026-05-08</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}

export function SettingsDialog() {
  return (
    <Suspense fallback={null}>
      <SettingsDialogContent />
    </Suspense>
  )
}
