"use client"

import { useState, useRef } from "react"
import {
  PlusIcon,
  SearchIcon,
  FolderIcon,
  MoreHorizontalIcon,
  CheckIcon,
  XIcon,
  SlidersHorizontalIcon,
  ChevronDownIcon,
  ImageIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const defaultCollections = [
  {
    id: "c1",
    name: "Claude Code 学习路径",
    videoCount: 4,
    completedCount: 2,
    tags: ["实战", "MCP"],
    cover: null as string | null,
    description: "",
  },
  {
    id: "c2",
    name: "RAG 技术专题",
    videoCount: 3,
    completedCount: 1,
    tags: ["RAG", "向量数据库"],
    cover: null as string | null,
    description: "",
  },
]

export default function CollectionsPage() {
  const [collections, setCollections] = useState(defaultCollections)
  const [search, setSearch] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterTag, setFilterTag] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragNode = useRef<HTMLAnchorElement | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newTagInput, setNewTagInput] = useState("")
  const [newTags, setNewTags] = useState<string[]>([])
  const [newCover, setNewCover] = useState<string | null>(null)
  const [newCoverName, setNewCoverName] = useState<string | null>(null)
  const [newDescription, setNewDescription] = useState("")
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewCoverName(file.name)
    const reader = new FileReader()
    reader.onload = () => setNewCover(reader.result as string)
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setNewName("")
    setNewTagInput("")
    setNewTags([])
    setNewCover(null)
    setNewCoverName(null)
    setNewDescription("")
    setEditingId(null)
  }

  const openEditDialog = (col: typeof collections[number]) => {
    setEditingId(col.id)
    setNewName(col.name)
    setNewTags([...col.tags])
    setNewCover(col.cover)
    setNewDescription(col.description)
    setIsCreateOpen(true)
    setMenuOpenId(null)
  }

  const handleSave = () => {
    if (!newName.trim()) return
    if (editingId) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? { ...c, name: newName.trim(), tags: newTags, cover: newCover, description: newDescription.trim() }
            : c
        )
      )
    } else {
      const id = "c" + Date.now()
      setCollections((prev) => [
        {
          id,
          name: newName.trim(),
          videoCount: 0,
          completedCount: 0,
          tags: newTags,
          cover: newCover,
          description: newDescription.trim(),
        },
        ...prev,
      ])
    }
    resetForm()
    setIsCreateOpen(false)
  }

  const handleDelete = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id))
    setMenuOpenId(null)
  }

  const closeDialog = () => {
    setIsCreateOpen(false)
    resetForm()
  }

  const addTag = () => {
    const tag = newTagInput.trim()
    if (tag && !newTags.includes(tag)) {
      setNewTags((prev) => [...prev, tag])
    }
    setNewTagInput("")
  }

  const removeTag = (tag: string) => {
    setNewTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragNode.current = e.currentTarget as HTMLAnchorElement
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // Use a transparent image to hide the default ghost
    const img = new Image()
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    e.dataTransfer.setDragImage(img, 0, 0)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    setCollections((prev) => {
      const next = [...prev]
      const [removed] = next.splice(dragIndex, 1)
      next.splice(index, 0, removed)
      return next
    })
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragNode.current = null
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const allTags = Array.from(new Set(collections.flatMap((c) => c.tags)))

  const filtered = collections
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

            {/* New collection */}
            <button
              onClick={() => { resetForm(); setIsCreateOpen(true) }}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-background border border-zinc-200/60 dark:border-zinc-800/50 text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 rounded-lg shadow-none active:scale-97 cursor-pointer shrink-0 transition-all duration-200"
            >
              <PlusIcon className="size-3.5" />
              新建
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
                <button onClick={() => { resetForm(); setIsCreateOpen(true) }} className="mt-5 flex items-center gap-1.5 h-7 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg cursor-pointer transition-all">
                  <PlusIcon className="size-3.5" />
                  创建第一个合集
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 animate-in fade-in duration-200">
            {filtered.map((col, index) => {
              const progress = Math.round((col.completedCount / col.videoCount) * 100)
              const isDragging = dragIndex === index
              const isDragOver = dragOverIndex === index && dragIndex !== index
              return (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group relative flex flex-col rounded-xl border bg-card/45 overflow-hidden transition-all duration-200 shadow-xs cursor-pointer",
                    isDragging && "opacity-30 scale-95",
                    isDragOver && "border-zinc-400 dark:border-zinc-500 shadow-md scale-[1.02]",
                    !isDragging && !isDragOver && "border-zinc-200/50 dark:border-zinc-800/40 hover:border-zinc-400/40 hover:shadow-md"
                  )}
                >
                  {/* Cover — uploaded image or empty placeholder */}
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-850 border-b border-zinc-200/20 dark:border-zinc-800/20 flex items-center justify-center">
                    {col.cover ? (
                      <img src={col.cover} alt={col.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-1025 group-hover:brightness-103" />
                    ) : (
                      <ImageIcon className="size-5.5 text-muted-foreground/25" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                    <h4 className="line-clamp-2 text-xs font-semibold text-foreground/85 leading-snug group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                      {col.name}
                    </h4>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="h-[3px] w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/80">
                        <div
                          className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between select-none">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/45 font-mono">
                          <span>{col.videoCount} 个视频</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/45 font-mono">
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

                    {/* More button + dropdown */}
                    <div className="absolute top-2 right-2" onClick={(e) => e.preventDefault()}>
                      <button
                        className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 text-muted-foreground/50 hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === col.id ? null : col.id)
                        }}
                      >
                        <MoreHorizontalIcon className="h-3.5 w-3.5" />
                      </button>

                      {menuOpenId === col.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                          <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-background/98 dark:bg-zinc-950/98 backdrop-blur-md shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditDialog(col)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted/40 transition-colors cursor-pointer"
                            >
                              <PencilIcon className="size-3.5" />
                              编辑
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm("确定要删除这个合集吗？")) handleDelete(col.id)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2Icon className="size-3.5" />
                              删除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}

          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-250 select-none">
          <div
            className="relative w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 px-5.5 py-4 border-b border-zinc-200/40 dark:border-zinc-800/20">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
                <span className="text-xs font-semibold text-foreground/85 uppercase tracking-wider font-mono">{editingId ? "编辑合集" : "创建新合集"}</span>
              </div>
              <button
                onClick={closeDialog}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground transition-all duration-150"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5.5 space-y-4">
              {/* Name input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                  合集名称
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="输入合集名称..."
                  className="h-10 w-full rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-muted/10 px-3 text-xs outline-none transition-all focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/45"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSave()
                    }
                  }}
                />
              </div>

              {/* Cover upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                  合集封面
                </label>
                {newCover ? (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-200/60 dark:border-zinc-800/50 bg-muted/10 group/cover">
                    <img src={newCover} alt="封面预览" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/30 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => { setNewCover(null); setNewCoverName(null) }}
                        className="opacity-0 group-hover/cover:opacity-100 transition-all flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 dark:bg-zinc-950/90 text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm cursor-pointer"
                      >
                        <XIcon className="size-3" />
                        移除封面
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg py-6 px-4 bg-muted/5 hover:bg-muted/15 hover:border-zinc-400/45 transition-all duration-200 cursor-pointer group text-center"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-150/50 dark:bg-zinc-900 border border-zinc-250/20 dark:border-zinc-800/25 text-muted-foreground group-hover:text-foreground group-hover:scale-105 transition-all duration-250 mb-2 shadow-3xs">
                      <ImageIcon className="size-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground transition-colors">
                      上传封面图片
                    </span>
                    <span className="mt-0.5 text-[9px] text-muted-foreground/45 font-mono">
                      JPG, PNG · 推荐 16:9
                    </span>
                  </button>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                  描述
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="简要描述合集内容..."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-muted/10 px-3 py-2 text-xs outline-none transition-all focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/45 resize-none"
                />
              </div>

              {/* Tags input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                  标签
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="添加标签..."
                    className="h-9 flex-1 rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 bg-muted/10 px-3 text-xs outline-none transition-all focus:border-zinc-400/80 focus:bg-background focus:ring-1 focus:ring-zinc-400/10 placeholder:text-muted-foreground/45"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <button
                    onClick={addTag}
                    disabled={!newTagInput.trim()}
                    className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-zinc-200/60 dark:border-zinc-800/50 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                </div>

                {/* Tag chips */}
                {newTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {newTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-zinc-200/60 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tip */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-semibold select-none pt-1">
                <FolderIcon className="size-3" />
                <span>创建后可拖拽调整顺序，从视频库添加内容</span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/30 px-6 py-4 border-t border-zinc-200/40 dark:border-zinc-800/20 flex items-center justify-end gap-2.5">
              <button
                onClick={closeDialog}
                className="h-8.5 px-4 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all duration-150 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!newName.trim()}
                className="h-8.5 px-4 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 rounded-lg shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingId ? "保存修改" : "创建合集"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
