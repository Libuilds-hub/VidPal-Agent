import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsIcon, DatabaseIcon, GlobeIcon, KeyIcon } from "lucide-react"

export default function SettingsPage() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-muted-foreground">配置您的视频分析工具</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
              <KeyIcon className="h-4 w-4" />
              API 设置
            </CardTitle>
            <CardDescription>配置 AI 分析服务</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="输入您的 API Key" />
            </div>
            <Button>保存</Button>
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
      </div>
    </>
  )
}