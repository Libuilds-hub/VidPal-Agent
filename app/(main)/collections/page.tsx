"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  PlusIcon,
  SearchIcon,
  FolderIcon,
  PlayIcon,
  MoreHorizontalIcon,
  CheckIcon,
  TrashIcon,
  XIcon,
  SlidersHorizontalIcon,
  ChevronDownIcon,
} from "lucide-react"
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
    <div className={cn("grid gap-0.5", cells <= 1 ? "grid-cols-1" : "grid-cols-2")}>
      {Array.from({ length: cells }).map((_, i) => (
        <div
          key={i}
          className="aspect-video rounded-sm bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/30 dark:border-zinc-700/20 flex items-center justify-center"
        >
          <PlayIcon className="h-3 w-3 text-muted-foreground/25" />
        </div>
      ))}
    </div>
  )
}

export default function CollectionsPage() {
  const [search, setSearch] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterTag, setFilterTag] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const allTags = Array.from(new Set(sampleCollections.flatMap((c) => c.tags)))

  const filtered = sampleCollections
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .filter((c) => filterTag === "all" || c.tags.includes(filterTag))
    .filter((c) => {
      if (filterStatus === "all") return true
      if (filterStatus === "done") return c.completedCount === c.videoCount
      if (filterStatus === "inprogress") return c.completedCount > 0 && c.completedCount < c.videoCount
      if (filterStatus === "unstarted") return c.completedCount === 0
      return true
    })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background">
      <div className="flex flex-col gap-5 px-6 py-6 max-w-6xl w-full mx-auto">

        {/* Toolbar Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3 border-b border-zinc-200/50 dark:border-zinc-800/40 select-none animate-in fade-in duration-200">
          <div className="flex flex-1 items-center gap-2 max-w-xl">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索合集..."
                className="h-8 w-full rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-background/50 pl-8 pr-3 text-xs outline-none transition-all duration-150 focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/45 font-medium"
              />
            </div>

            {/* Filter dropdown */}
            <div className="relative z-30">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer select-none active:scale-97",
                  isFilterOpen || filterTag !== "all" || filterStatus !== "all"
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100"
                    : "bg-background border-zinc-200/60 dark:border-zinc-800/50 text-muted-foreground/80 hover:text-foreground hover:bg-muted/40"
                )}
              >
                <SlidersHorizontalIcon className="size-3.5" />
                <span>筛选</span>
                <ChevronDownIcon className={cn("size-3.5 transition-transform duration-250", isFilterOpen && "rotate-180")} />
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-30 cursor-default" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute left-0 mt-1.5 z-40 w-72 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 bg-background/98 dark:bg-zinc-950/98 backdrop-blur-md p-4.5 shadow-xl select-none animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">

                    {/* Tag filter */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block font-mono">标签</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["all", ...allTags].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setFilterTag(tag)}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-md border transition-all duration-200 cursor-pointer",
                              filterTag === tag
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs"
                                : "bg-white/40 dark:bg-zinc-900/5 border-zinc-200/60 dark:border-zinc-800/40 text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-zinc-900/30"
                            )}
                          >
                            {tag === "all" ? "全部" : tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status filter */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block font-mono">学习进度</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: "all", label: "全部" },
                          { key: "done", label: "已完成" },
                          { key: "inprogress", label: "进行中" },
                          { key: "unstarted", label: "未开始" },
                        ].map((s) => (
                          <button
                            key={s.key}
                            onClick={() => setFilterStatus(s.key)}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-md border transition-all duration-200 cursor-pointer",
                              filterStatus === s.key
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs"
                                : "bg-white/40 dark:bg-zinc-900/5 border-zinc-200/60 dark:border-zinc-800/40 text-muted-foreground hover:text-foreground hover:bg-white/80 dark:hover:bg-zinc-900/30"
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3.5 border-t border-zinc-200/40 dark:border-zinc-800/20 flex items-center justify-between">
                      <button
                        onClick={() => { setFilterTag("all"); setFilterStatus("all") }}
                        className="text-[10px] text-muted-foreground hover:text-zinc-950 dark:hover:text-zinc-100 font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        重置所有
                      </button>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="h-7 px-3 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-[10px] tracking-wider uppercase transition-colors cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* New collection — only one instance */}
            <button
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-background border border-zinc-200/60 dark:border-zinc-800/50 text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 rounded-lg shadow-none active:scale-97 cursor-pointer shrink-0 transition-all duration-200"
            >
              <PlusIcon className="size-3.5" />
              新建合集
            </button>
          </div>
        </div>

        {/* Active Filter Pills */}
        {(filterTag !== "all" || filterStatus !== "all") && (
          <div className="flex flex-wrap items-center gap-2.5 py-1 select-none animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-[10px] text-muted-foreground/45 font-mono uppercase tracking-wider font-bold">已启用筛选:</span>
            {filterTag !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10.5px] font-semibold border border-zinc-200/60 dark:border-zinc-700">
                标签: {filterTag}
                <button onClick={() => setFilterTag("all")} className="hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
                  <XIcon className="size-3" />
                </button>
              </span>
            )}
            {filterStatus !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10.5px] font-semibold border border-zinc-200/60 dark:border-zinc-700">
                进度: {{ done: "已完成", inprogress: "进行中", unstarted: "未开始" }[filterStatus]}
                <button onClick={() => setFilterStatus("all")} className="hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
                  <XIcon className="size-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => { setFilterTag("all"); setFilterStatus("all") }}
              className="text-xs text-muted-foreground hover:text-zinc-950 dark:hover:text-zinc-100 font-semibold transition-colors cursor-pointer ml-1 underline underline-offset-2"
            >
              全部清空
            </button>
          </div>
        )}

        {/* Grid Content */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200/80 dark:border-zinc-800/80 bg-card/10 select-none">
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card/85 text-muted-foreground/60 shadow-xs">
                <FolderIcon className="size-5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground/80">
                {search ? "未找到匹配的合集" : "暂无合集"}
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/65 leading-normal">
                {search
                  ? "请尝试更换搜索关键词"
                  : "创建合集来按主题组织你的视频，追踪学习进度"}
              </p>
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  className="mt-5 flex items-center gap-1.5 h-7 px-3 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg cursor-pointer transition-all"
                >
                  清除搜索
                </button>
              ) : (
                <button className="mt-5 flex items-center gap-1.5 h-7 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg cursor-pointer transition-all">
                  <PlusIcon className="size-3.5" />
                  创建第一个合集
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-200">
            {filtered.map((col) => {
              const progress = Math.round((col.completedCount / col.videoCount) * 100)
              return (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="group relative flex flex-col rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-card/45 overflow-hidden transition-all duration-300 shadow-xs hover:border-zinc-400/40 hover:shadow-md cursor-pointer"
                >
                  {/* Cover mosaic area */}
                  <div className="p-3 pb-2.5 border-b border-zinc-200/25 dark:border-zinc-800/20 bg-zinc-50/30 dark:bg-zinc-900/10">
                    <CollectionCoverMosaic count={col.videoCount} />
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex flex-col gap-3 flex-1">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold text-foreground/85 leading-snug line-clamp-2 group-hover:text-foreground transition-colors tracking-tight">
                        {col.name}
                      </span>
                      <button
                        className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground/50 hover:text-foreground"
                        onClick={(e) => e.preventDefault()}
                        title="更多操作"
                      >
                        <MoreHorizontalIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="h-[3px] w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/80">
                        <div
                          className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono select-none">
                        <span className="text-muted-foreground/55">{col.videoCount} 个视频</span>
                        <div className="flex items-center gap-1 text-muted-foreground/55">
                          <CheckIcon className="h-2.5 w-2.5" />
                          <span>{col.completedCount}/{col.videoCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {col.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 select-none">
                        {col.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-zinc-200/60 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 text-muted-foreground/60 uppercase tracking-wider"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}

          </div>
        )}
      </div>
    </div>
  )
}
