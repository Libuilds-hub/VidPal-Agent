// app/(settings)/settings/skills/page.tsx —— 技能安装管理：已安装 / 精选 / ZIP 上传
"use client"

import { useEffect, useRef, useState } from "react"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { StatusBanner } from "@/components/settings/settings-ui"
import { Loader2, UploadCloud, Package } from "lucide-react"
import { createRuntimeClient } from "@/lib/runtime-client"
import type { SkillCatalogEntry, SkillIndexEntry } from "@/runtime/shared/types"

const runtime = createRuntimeClient()

export default function SkillsSettingsPage() {
  const [installed, setInstalled] = useState<SkillIndexEntry[]>([])
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    try {
      const [i, c] = await Promise.all([runtime.listSkills(), runtime.getSkillCatalog()])
      setInstalled(i)
      setCatalog(c)
      setMessage(null)
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "无法连接 Agent Runtime" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const toggle = async (name: string) => {
    setMessage(null)
    if (expanded === name) {
      setExpanded(null)
      return
    }
    setExpanded(name)
    setContent("")
    try {
      const s = await runtime.getSkill(name)
      setContent(s.content)
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "加载失败" })
    }
  }

  const install = async (name: string) => {
    setBusy(name)
    setMessage(null)
    try {
      await runtime.installSkill(name)
      await refresh()
      setMessage({ type: "success", text: `技能 ${name} 已安装` })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "安装失败" })
    } finally {
      setBusy(null)
    }
  }

  const remove = async (name: string) => {
    setBusy(name)
    setMessage(null)
    try {
      await runtime.deleteSkill(name)
      setConfirmDelete(null)
      await refresh()
      setMessage({ type: "success", text: `技能 ${name} 已卸载` })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "卸载失败" })
    } finally {
      setBusy(null)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy("upload")
    setMessage(null)
    try {
      await runtime.uploadSkillZip(file)
      if (fileRef.current) fileRef.current.value = ""
      await refresh()
      setMessage({ type: "success", text: `技能已从 ${file.name} 安装` })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "上传失败" })
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="技能管理" description="管理 Agent 技能：查看已安装技能、从精选列表安装、或上传 ZIP 安装自己的技能" />
        {message && <StatusBanner type={message.type} text={message.text} onDismiss={() => setMessage(null)} />}

        {/* 已安装技能 */}
        <section className="rounded-xl border border-border/40 bg-card">
          <div className="border-b border-border/20 px-4 py-2.5 text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-wider select-none">已安装技能</div>
          {installed.length === 0 && <div className="px-4 py-8 text-center text-xs text-muted-foreground">暂无技能</div>}
          {installed.map((s) => (
            <div key={s.name} className="border-b border-border/20 last:border-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button onClick={() => toggle(s.name)} aria-expanded={expanded === s.name} className="min-w-0 flex-1 text-left hover:opacity-80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{s.name}</span>
                    {s.default && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">默认装载</span>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground/60">v{s.version}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.description}</p>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs text-muted-foreground/50">{expanded === s.name ? "收起 ▲" : "查看 ▼"}</span>
                  <button
                    onClick={() => (confirmDelete === s.name ? remove(s.name) : setConfirmDelete(s.name))}
                    disabled={busy === s.name}
                    className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                      confirmDelete === s.name
                        ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                        : "border-border/40 text-muted-foreground/70 hover:border-red-500/40 hover:text-red-500"
                    }`}
                  >
                    {busy === s.name ? "处理中…" : confirmDelete === s.name ? "确认卸载？" : "卸载"}
                  </button>
                </div>
              </div>
              {expanded === s.name && (
                <pre className="max-h-96 overflow-auto border-t border-border/20 bg-muted/30 p-4 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {content || "加载中…"}
                </pre>
              )}
            </div>
          ))}
        </section>

        {/* 精选技能 */}
        <section className="rounded-xl border border-border/40 bg-card">
          <div className="border-b border-border/20 px-4 py-2.5 text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-wider select-none">精选技能</div>
          {catalog.length === 0 && <div className="px-4 py-8 text-center text-xs text-muted-foreground">暂无精选技能</div>}
          {catalog.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-3 border-b border-border/20 px-4 py-3 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{s.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/60">v{s.version}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
              </div>
              <button
                onClick={() => install(s.name)}
                disabled={s.preinstalled || busy === s.name}
                className={`shrink-0 rounded-md border px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
                  s.preinstalled
                    ? "cursor-default border-border/20 text-muted-foreground/40"
                    : "border-primary/30 text-primary hover:bg-primary/5"
                }`}
              >
                {busy === s.name ? "安装中…" : s.preinstalled ? "已安装" : "安装"}
              </button>
            </div>
          ))}
        </section>

        {/* 上传技能 */}
        <section className="rounded-xl border border-dashed border-border/50 bg-card/60">
          <div className="px-4 py-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UploadCloud className="h-4 w-4 text-muted-foreground" />
              上传 ZIP 安装技能
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-normal">
              压缩包内需为 SKILL.md 或单个技能文件夹（含 SKILL.md，可带附属文件）；frontmatter 的 name 须与文件夹名一致。
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/30 px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/5">
              <Package className="h-3.5 w-3.5" />
              {busy === "upload" ? "上传中…" : "选择 .zip 文件"}
              <input
                ref={fileRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                disabled={busy !== null}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}
