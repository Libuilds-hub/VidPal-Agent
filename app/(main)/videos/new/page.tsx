"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  SendIcon,
  UploadIcon,
  FileVideoIcon,
  Loader2Icon,
  Link2Icon,
  ArrowLeftIcon,
  HelpCircleIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function AddVideoPage() {
  const [inputValue, setInputValue] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

  // Redirect users visiting this page directly to the videos page with query parameter
  useEffect(() => {
    router.replace("/videos?import=true")
  }, [router])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    setIsLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/video/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputValue.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "解析视频失败")
      }

      setMessage({ type: "success", text: "视频分析任务创建成功，正在跳转..." })
      setInputValue("")

      // 2秒后跳转到视频库
      setTimeout(() => {
        router.push("/videos")
      }, 1500)
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "解析视频失败" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsLoading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/video/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "上传视频失败")
      }

      setMessage({ type: "success", text: "视频文件上传成功，正在跳转..." })
      setFileName(null)

      // 2秒后跳转到视频库
      setTimeout(() => {
        router.push("/videos")
      }, 1500)
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "上传视频失败" })
      setFileName(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto detect platform icon / text based on input url
  const detectPlatform = (url: string) => {
    if (!url) return null
    if (url.includes("bilibili.com") || url.includes("b23.tv")) return "BiliBili"
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube"
    return "Auto Detect"
  }

  const platform = detectPlatform(inputValue)

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-2xl w-full flex flex-col gap-4.5 animate-in fade-in slide-in-from-bottom-3 duration-250">
        
        {/* Back Link */}
        <div className="flex items-center justify-between select-none">
          <Link
            href="/videos"
            className="flex items-center gap-1.5 text-xs text-muted-foreground/75 hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeftIcon className="size-3.5" />
            返回视频库
          </Link>
          
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <HelpCircleIcon className="size-3" />
            支持 B站、YouTube 与本地 MP4/MOV/MKV
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <div
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded border text-xs leading-none select-none font-medium transition-all",
              message.type === "success"
                ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-500"
                : "border-rose-500/15 bg-rose-500/5 text-rose-500"
            )}
          >
            {message.type === "success" ? (
              <CheckCircle2Icon className="size-4 shrink-0" />
            ) : (
              <AlertCircleIcon className="size-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Selected file preview */}
        {fileName && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded border border-border/40 bg-muted/20 text-xs font-medium select-none">
            <FileVideoIcon className="size-4 text-primary shrink-0" />
            <span className="truncate flex-1 text-foreground/80">{fileName}</span>
            {isLoading && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
            {!isLoading && (
              <button
                onClick={() => setFileName(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors px-1"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Linear-style Composer Card */}
        <div className="border border-border/45 bg-card/35 rounded-lg overflow-hidden shadow-[0_3px_12px_rgba(0,0,0,0.02)]">
          
          {/* Title input bar (fake issue name field) */}
          <div className="flex items-center justify-between bg-muted/15 px-4.5 py-2.5 border-b border-border/35 select-none">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/75 animate-pulse" />
              <span className="text-[11px] font-semibold text-foreground/75 uppercase tracking-wider">新建视频提取任务</span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 font-mono">TASK-ID: AUTO</span>
          </div>

          {/* Core Input Area */}
          <div className="p-4.5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                视频链接地址 (Video URL)
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="粘贴 B站 或 YouTube 视频网页链接..."
                  className="h-10 w-full rounded border border-border/45 bg-muted/10 px-3 pl-8.5 text-xs outline-none transition-all focus:border-primary/80 focus:bg-background focus:ring-1 focus:ring-primary/10 placeholder:text-muted-foreground/45"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Link2Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/45" />
              </div>
            </div>

            {/* Platform detection indicator tag */}
            {platform && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/80 select-none">
                <span>识别到目标平台:</span>
                <span className="rounded px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">
                  {platform}
                </span>
              </div>
            )}
          </div>

          {/* Composer Footer Actions */}
          <div className="bg-muted/15 px-4.5 py-3 border-t border-border/35 flex items-center justify-between flex-wrap gap-3">
            
            {/* Left Actions: Upload file instead */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="video-upload"
                className="flex items-center gap-1.5 px-3 h-7 rounded border border-border/45 bg-background text-[11px] font-medium text-foreground/75 hover:bg-muted/30 cursor-pointer transition-colors shadow-sm select-none"
              >
                {isLoading && fileName ? (
                  <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
                ) : (
                  <UploadIcon className="size-3 text-muted-foreground" />
                )}
                <span>上传本地视频文件</span>
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>

            {/* Right Actions: Confirm import */}
            <div className="flex items-center gap-2.5">
              <Button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="h-7 px-3.5 text-[11px] font-medium bg-foreground text-background hover:bg-foreground/90 rounded border-none shadow-sm gap-1.5"
              >
                {isLoading && !fileName ? (
                  <>
                    <Loader2Icon className="size-3 animate-spin" />
                    <span>正在创建...</span>
                  </>
                ) : (
                  <>
                    <SendIcon className="size-3" />
                    <span>创建分析任务</span>
                  </>
                )}
              </Button>
            </div>

          </div>

        </div>

        {/* Tip text */}
        <p className="text-[10px] text-center text-muted-foreground/60 leading-normal select-none">
          解析模块会自动提取视频的音频音轨，并使用高精度语音模型还原字幕文本，最终交由 AI Assistant 提炼知识节点。
        </p>

      </div>
    </div>
  )
}