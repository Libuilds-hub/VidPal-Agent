"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusIcon, SearchIcon, FolderIcon, PlayIcon, MoreHorizontalIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const sampleCollections = [
  {
    id: "c1",
    name: "Claude Code 学习路径",
    videoCount: 4,
    completedCount: 2,
    tags: ["实战", "MCP"],
  },
  {
    id: "c2",
    name: "RAG 技术专题",
    videoCount: 3,
    completedCount: 1,
    tags: ["RAG", "向量数据库"],
  },
]

function CollectionCoverMosaic({ count }: { count: number }) {
  const cells = Math.min(count, 4)
  return (
    <div className={cn("grid gap-0.5", cells === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {Array.from({ length: cells }).map((_, i) => (
        <div
          key={i}
          className="aspect-video rounded-sm bg-muted/60 border border-border/30 flex items-center justify-center"
        >
          <PlayIcon className="h-3 w-3 text-muted-foreground/30" />
        </div>
      ))}
    </div>
  )
}

export default function CollectionsPage() {
  const hasCollections = sampleCollections.length > 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-6 max-w-5xl w-full mx-auto">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5 select-none">
            <h1 className="text-[18px] font-semibold tracking-tight text-foreground/90">合集</h1>
            <p className="text-xs text-muted-foreground/70">按主题整理视频，追踪学习进度</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                id="collections-search"
                placeholder="搜索合集..."
                className="pl-7 h-7 w-44 text-xs rounded border border-border/40 bg-muted/40 focus:bg-background focus:border-primary/30 placeholder:text-muted-foreground/40"
              />
            </div>
            <button
              id="new-collection-btn"
              className="h-7 px-3 flex items-center gap-1.5 text-[11px] font-medium rounded border border-border/40 bg-card hover:bg-muted/60 transition-all duration-150 text-foreground/80"
            >
              <PlusIcon className="h-3 w-3" />
              新建合集
            </button>
          </div>
        </div>

        {hasCollections ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sampleCollections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.id}`}
                className="group flex flex-col rounded-md border border-border/40 bg-card hover:border-border/70 hover:bg-card transition-all duration-150 overflow-hidden"
              >
                {/* Cover mosaic */}
                <div className="p-2.5 pb-2 border-b border-border/25">
                  <CollectionCoverMosaic count={col.videoCount} />
                </div>

                {/* Info */}
                <div className="p-2.5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-medium text-foreground/85 leading-tight truncate">{col.name}</span>
                    <button
                      className="shrink-0 h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/70"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontalIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground/60">{col.videoCount} 个视频</span>
                    <div className="flex items-center gap-1 text-muted-foreground/55">
                      <CheckIcon className="h-2.5 w-2.5" />
                      <span>{col.completedCount}/{col.videoCount}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${(col.completedCount / col.videoCount) * 100}%` }}
                    />
                  </div>

                  {/* Tags */}
                  {col.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {col.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-border/35 text-muted-foreground/60">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}

            {/* New collection card — always visible */}
            <button
              id="add-collection-card"
              className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border/40 bg-transparent hover:border-primary/30 hover:bg-muted/20 transition-all duration-150 min-h-[160px]"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-border/40 text-muted-foreground/35">
                  <PlusIcon className="h-4 w-4" />
                </div>
                <span className="text-[11px] text-muted-foreground/50">新建合集</span>
              </div>
            </button>
          </div>
        ) : (
          /* Empty state — Linear "no items" wireframe */
          <div className="flex flex-1 items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border/40 bg-muted/40">
                <FolderIcon className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/80">还没有合集</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">创建合集来按主题组织你的视频</p>
              </div>
              <button className="mt-1 h-7 px-3 flex items-center gap-1.5 text-[11px] font-medium rounded border border-border/40 bg-card hover:bg-muted/60 transition-all duration-150">
                <PlusIcon className="h-3 w-3" />
                创建第一个合集
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
