"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendIcon, UploadIcon, FileVideoIcon, LoaderIcon } from "lucide-react"

export default function AddVideoPage() {
  const [inputValue, setInputValue] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

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

      setMessage({ type: "success", text: "视频添加成功！" })
      setInputValue("")

      // 2秒后跳转到视频库
      setTimeout(() => {
        router.push("/videos")
      }, 2000)
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

      setMessage({ type: "success", text: "视频上传成功！" })
      setFileName(null)

      // 2秒后跳转到视频库
      setTimeout(() => {
        router.push("/videos")
      }, 2000)
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "上传视频失败" })
      setFileName(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] justify-center">
      <div className="text-center text-muted-foreground max-w-md mx-auto mb-8">
        <FileVideoIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-base">在下方输入视频链接或上传本地视频文件开始分析</p>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 mb-4">
        {message && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {fileName && (
          <div className="mb-3 px-3 py-2 bg-muted/50 rounded-lg flex items-center gap-3">
            <FileVideoIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate flex-1">{fileName}</span>
            <button
              onClick={() => setFileName(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 p-2 bg-muted/50 border rounded-xl">
          <label
            htmlFor="video-upload"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-background border shadow-sm hover:bg-muted cursor-pointer transition-colors shrink-0"
          >
            {isLoading ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <UploadIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isLoading}
          />

          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="粘贴视频链接..."
            className="min-h-[44px] max-h-[100px] resize-none bg-background border-0 shadow-none py-2"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          <Button
            size="icon"
            className="w-9 h-9 rounded-lg shrink-0"
            onClick={handleSend}
            disabled={isLoading || (!inputValue.trim() && !fileName)}
          >
            {isLoading ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="mt-2 text-xs text-center text-muted-foreground">
          支持 B站、YouTube 链接及 MP4、MKV、MOV、AVI 格式
        </p>
      </div>
    </div>
  )
}