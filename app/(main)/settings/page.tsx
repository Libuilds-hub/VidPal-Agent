"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsIcon, DatabaseIcon, GlobeIcon, BotIcon, LoaderIcon } from "lucide-react"

const PROVIDERS = {
  minimax: {
    name: "MiniMax",
    baseUrl: "https://api.minimaxi.com/v1",
    defaultModel: "MiniMax-M2.7",
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
  },
}

export default function SettingsPage() {
  const [provider, setProvider] = useState<"minimax" | "deepseek">("minimax")
  const [model, setModel] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setModel(PROVIDERS[provider].defaultModel)
  }, [provider])

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (res.ok && data.llmProvider) {
          setProvider(data.llmProvider as "minimax" | "deepseek")
          setModel(data.llmModel || PROVIDERS[data.llmProvider as "minimax" | "deepseek"].defaultModel)
          setApiKey(data.llmApiKey || "")
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvider(e.target.value as "minimax" | "deepseek")
    setMessage(null)
  }

  const handleSave = async () => {
    if (!apiKey || !model) {
      setMessage({ type: "error", text: "请填写 API Key 和模型名称" })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // 先测试 API 连接
      const testRes = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: PROVIDERS[provider].baseUrl,
          apiKey,
          model,
        }),
      })

      const testData = await testRes.json()

      if (!testRes.ok) {
        setMessage({ type: "error", text: testData.error || "API 连接失败" })
        return
      }

      // API 测试成功后保存到数据库
      const saveRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmProvider: provider,
          llmApiKey: apiKey,
          llmModel: model,
        }),
      })

      const saveData = await saveRes.json()

      if (saveRes.ok) {
        setMessage({ type: "success", text: "设置已保存，API 连接成功" })
      } else {
        setMessage({ type: "error", text: saveData.error || "保存失败" })
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "保存失败",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">设置</h1>
            <p className="text-muted-foreground">配置您的视频分析工具</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseIcon className="h-4 w-4" />
                数据库设置
              </CardTitle>
              <CardDescription>配置本地存储选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="db-path">数据库路径</Label>
                <Input id="db-path" defaultValue="./data/video-analysis.db" />
              </div>
              <Button>保存</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GlobeIcon className="h-4 w-4" />
                视频源设置
              </CardTitle>
              <CardDescription>配置视频解析服务</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ytdlp-path">yt-dlp 路径</Label>
                <Input id="ytdlp-path" defaultValue="yt-dlp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ffmpeg-path">FFmpeg 路径</Label>
                <Input id="ffmpeg-path" defaultValue="ffmpeg" />
              </div>
              <Button>保存</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BotIcon className="h-4 w-4" />
                LLM API 设置
              </CardTitle>
              <CardDescription>配置大语言模型 API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-provider">选择 API 提供商</Label>
                <select
                  id="llm-provider"
                  value={provider}
                  onChange={handleProviderChange}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="minimax">MiniMax</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="llm-model">模型名称</Label>
                <Input
                  id="llm-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="输入模型名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="llm-api-key">API Key</Label>
                <Input
                  id="llm-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入您的 API Key"
                />
              </div>
              {message && (
                <div
                  className={`text-sm px-3 py-2 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {message.text}
                </div>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving && <LoaderIcon className="h-4 w-4 mr-1 animate-spin" />}
                保存
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                导出设置
              </CardTitle>
              <CardDescription>配置导出和同步选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="export-path">默认导出路径</Label>
                <Input id="export-path" defaultValue="./exports" />
              </div>
              <Button>保存</Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}