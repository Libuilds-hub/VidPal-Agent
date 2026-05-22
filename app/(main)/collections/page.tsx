"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusIcon, SearchIcon, FolderIcon, PlayIcon, MoreHorizontalIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const sampleCollections = [
  {
    id: "c1",
    name: "Claude Code 学习路径",
    videoCount: 4,
    completedCount: 2,
    coverColors: ["from-indigo-500 to-indigo-600", "from-blue-500 to-blue-600", "from-violet-500 to-violet-600", "from-sky-500 to-sky-600"],
  },
  {
    id: "c2",
    name: "RAG 技术专题",
    videoCount: 3,
    completedCount: 1,
    coverColors: ["from-emerald-500 to-emerald-600", "from-teal-500 to-teal-600", "from-green-500 to-green-600"],
  },
]

export default function CollectionsPage() {
  const hasCollections = sampleCollections.length > 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">合集</h1>
            <p className="text-sm text-muted-foreground">
              按主题整理视频，追踪学习进度
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索合集..." className="pl-9 h-9 w-48" />
            </div>
            <Button size="sm" className="gap-1.5 h-9">
              <PlusIcon className="size-4" />
              新建合集
            </Button>
          </div>
        </div>

        {hasCollections ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sampleCollections.map((col) => (
              <Card
                key={col.id}
                className="group cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                {/* Cover mosaic */}
                <div className="grid grid-cols-2 gap-0.5 p-3 pb-1.5">
                  {col.coverColors.map((color, i) => (
                    <div
                      key={i}
                      className={cn(
                        "aspect-video rounded-md bg-gradient-to-br flex items-center justify-center",
                        color
                      )}
                    >
                      <PlayIcon className="size-5 text-white/60" />
                    </div>
                  ))}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm truncate">{col.name}</CardTitle>
                    <button className="shrink-0 rounded-md p-1 opacity-0 transition-all hover:bg-muted group-hover:opacity-100">
                      <MoreHorizontalIcon className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                  <CardDescription>
                    {col.videoCount} 个视频
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">学习进度</span>
                      <span className="font-medium">
                        {col.completedCount}/{col.videoCount}
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${(col.completedCount / col.videoCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* New collection card — always visible */}
            <Card className="flex cursor-pointer items-center justify-center border-dashed transition-all duration-200 hover:border-primary/40 hover:bg-primary/5">
              <CardContent className="flex flex-col items-center gap-2 py-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20 text-muted-foreground/40 transition-all group-hover:border-primary/40 group-hover:text-primary/60">
                  <PlusIcon className="size-5" />
                </div>
                <span className="text-[13px] font-medium text-muted-foreground">
                  新建合集
                </span>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-md border-dashed">
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <FolderIcon className="size-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">还没有合集</p>
                  <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
                    创建合集来按主题组织你的视频，追踪每个主题的学习进度
                  </p>
                  <Button size="sm" className="mt-4 gap-1.5 h-9">
                    <PlusIcon className="size-4" />
                    创建第一个合集
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
