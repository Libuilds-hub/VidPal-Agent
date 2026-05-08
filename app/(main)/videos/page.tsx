import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VideoIcon, PlusIcon, SearchIcon, FilterIcon } from "lucide-react"

export default function VideosPage() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">视频库</h1>
            <p className="text-muted-foreground">管理您的视频收藏和分析结果</p>
          </div>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            添加视频
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索视频..." className="pl-9" />
          </div>
          <Button variant="outline">
            <FilterIcon className="mr-2 h-4 w-4" />
            筛选
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>视频列表</CardTitle>
          <CardDescription>您添加的所有视频将显示在这里</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <VideoIcon className="h-12 w-12 mb-4" />
            <p>暂无视频</p>
            <p className="text-sm">点击上方的"添加视频"开始</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}