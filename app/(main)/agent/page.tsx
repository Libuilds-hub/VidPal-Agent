// app/(main)/agent/page.tsx —— Agent 控制台：任务列表
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createRuntimeClient } from "@/lib/runtime-client"
import type { TaskRow } from "@/runtime/shared/types"

const runtime = createRuntimeClient()

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "等待中", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  running: { label: "运行中", cls: "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" },
  done: { label: "已完成", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "失败", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "已取消", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  interrupted: { label: "已中断", cls: "bg-amber-50 text-amber-700 border-amber-200" },
}

const typeLabel: Record<string, string> = {
  echo: "测试",
  import_video: "导入视频",
  regenerate: "重新生成",
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return `${m}m${s}s`
}

export default function AgentPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await runtime.listTasks(undefined, typeFilter === "all" ? undefined : typeFilter)
      setTasks(list)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法连接 Agent Runtime")
    }
  }, [typeFilter])

  useEffect(() => {
    refresh()
    timerRef.current = setInterval(refresh, 2500)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  const cancel = async (taskId: string) => {
    try {
      await runtime.cancelTask(taskId)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消失败")
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Agent 控制台</h1>
          <p className="mt-0.5 text-xs text-zinc-500">任务实时状态 · 数据来自 Runtime（:3100）</p>
        </div>
        <div className="flex gap-1.5">
          <Link href="/agent/skills" className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50">
            技能管理
          </Link>
          <a href={`${runtime.baseUrl}/tasks`} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50">
            Runtime API
          </a>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

      <div className="mb-4 flex gap-1.5">
        {["all", "echo", "import_video", "regenerate"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
              typeFilter === t
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {t === "all" ? "全部" : typeLabel[t] ?? t}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-[1fr_90px_110px_70px_80px] gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <span>任务</span>
          <span>类型</span>
          <span>耗时</span>
          <span>阶段</span>
          <span className="text-right">操作</span>
        </div>
        {tasks.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-zinc-400">暂无任务</div>
        )}
        {tasks.map((t) => {
          const st = statusConfig[t.status] ?? statusConfig.pending
          const duration = Math.max(0, t.updatedAt - t.createdAt)
          return (
            <div key={t.id} className="grid grid-cols-[1fr_90px_110px_70px_80px] items-center gap-3 border-b border-zinc-50 px-4 py-2.5 text-sm last:border-0 hover:bg-zinc-50/50">
              <div className="min-w-0">
                <Link href={`/agent/tasks/${t.id}`} className="block truncate font-mono text-xs text-zinc-700 hover:text-zinc-950 hover:underline">
                  {t.id}
                </Link>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${st.cls}`}>
                  {st.label}
                </span>
                {t.status === "failed" && t.error && (
                  <p className="mt-1 truncate text-[11px] text-rose-500" title={t.error}>{t.error}</p>
                )}
              </div>
              <span className="font-mono text-xs text-zinc-500">{typeLabel[t.type] ?? t.type}</span>
              <span className="font-mono text-xs text-zinc-400">{t.status === "pending" ? "—" : fmtDuration(duration)}</span>
              <span className="font-mono text-xs text-zinc-400">{t.stage}</span>
              <div className="flex justify-end gap-1">
                {(t.status === "pending" || t.status === "running") && (
                  <button
                    onClick={() => cancel(t.id)}
                    className="rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-500 hover:border-rose-200 hover:text-rose-500"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
