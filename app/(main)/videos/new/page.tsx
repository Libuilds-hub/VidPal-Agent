"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendIcon, UploadIcon, FileVideoIcon } from "lucide-react"

export default function AddVideoPage() {
  const [inputValue, setInputValue] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)

  const handleSend = () => {
    if (inputValue.trim()) {
      console.log("处理视频链接:", inputValue)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      console.log("处理文件:", file.name)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] justify-center">
      <div className="text-center text-muted-foreground max-w-md mx-auto mb-8">
        <FileVideoIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-base">在下方输入视频链接或上传本地视频文件开始分析</p>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 mb-4">
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
            <UploadIcon className="h-4 w-4 text-muted-foreground" />
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="粘贴视频链接..."
            className="min-h-[44px] max-h-[100px] resize-none bg-background border-0 shadow-none py-2"
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
            disabled={!inputValue.trim() && !fileName}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-2 text-xs text-center text-muted-foreground">
          支持 B站、YouTube 链接及 MP4、MKV、MOV、AVI 格式
        </p>
      </div>
    </div>
  )
}