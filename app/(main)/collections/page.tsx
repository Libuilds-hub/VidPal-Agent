import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VideoIcon, SearchIcon, PlusIcon, FolderIcon } from "lucide-react"

export default function CollectionsPage() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索合集..." className="pl-9" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>我的合集</CardTitle>
          <CardDescription>管理您的视频合集</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FolderIcon className="h-12 w-12 mb-4" />
            <p>暂无合集</p>
            <p className="text-sm">创建合集来整理您的视频</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}