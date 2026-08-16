// app/(main)/agent/tasks/[id]/page.tsx —— 任务详情：SSE 实时时间线
"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createRuntimeClient } from "@/lib/runtime-client"
import type { TaskRow } from "@/runtime/shared/types"

const runtime = createRuntimeClient()

interface TimelineItem {
  seq: number
  type: string
  time: number
  payload: Record<string, unknown>
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "等待中", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  running: { label: "运行中", cls: "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" },
  done: { label: "已完成", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "失败", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "已取消", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  interrupted: { label: "已中断", cls: "bg-amber-50 text-amber-700 border-amber-200" },
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false })
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const taskId = params.id
  const [task, setTask] = useState<TaskRow | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [dangerousTools, setDangerousTools] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // 工具索引（dangerous 高亮用）
  useEffect(() => {
    let alive = true
    runtime
      .listTools()
      .then((tools) => {
        if (alive) setDangerousTools(new Set(tools.filter((t) => t.dangerous).map((t) => t.name)))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // 任务元数据轮询（状态变化低频，2.5s 足够）
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const t = await runtime.getTask(taskId)
        if (alive) setTask(t)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "任务不存在")
      }
    }
    tick()
    const timer = setInterval(tick, 2500)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [taskId])

  // SSE 事件订阅（断线自动重连 + Last-Event-ID 回放）
  useEffect(() => {
    const unsub = runtime.subscribeTaskEvents(taskId, (ev) => {
      setTimeline((prev) => {
        if (prev.some((i) => i.seq === ev.seq)) return prev
        const next: TimelineItem = {
          seq: ev.seq,
          type: ev.type,
          time: ev.createdAt,
          payload: (ev.payload ?? {}) as Record<string, unknown>,
        }
        return [...prev, next].sort((a, b) => a.seq - b.seq)
      })
    })
    return unsub
  }, [taskId])

  // 新事件自动滚底
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [timeline.length])

  const cancel = async () => {
    setCanceling(true)
    try {
      await runtime.cancelTask(taskId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消失败")
    } finally {
      setCanceling(false)
    }
  }

  const retry = async () => {
    setRetrying(true)
    try {
      const r = await runtime.retryTask(taskId)
      window.location.href = `/agent/tasks/${r.taskId}`
    } catch (e) {
      setError(e instanceof Error ? e.message : "重试失败")
    } finally {
      setRetrying(false)
    }
  }

  const st = task ? (statusConfig[task.status] ?? statusConfig.pending) : null

  const renderEvent = (item: TimelineItem) => {
    const p = item.payload
    switch (item.type) {
      case "task_started":
        return <span className="text-zinc-600">任务启动</span>
      case "stage":
        return <span className="font-semibold text-blue-600">阶段：{(p.stage as string) ?? ""}</span>
      case "tool_start": {
        const name = (p.name as string) ?? ""
        const dangerous = dangerousTools.has(name)
        return (
          <span className="flex items-center gap-1.5">
            <span className={dangerous ? "font-bold text-rose-600" : "font-semibold text-indigo-600"}>
              🔧 {name}
            </span>
            {dangerous && (
              <span className="rounded bg-rose-50 px-1 text-[9px] font-bold text-rose-500 border border-rose-200">
                危险
              </span>
            )}
            <span className="font-mono text-[11px] text-zinc-400">{JSON.stringify(p.args)}</span>
          </span>
        )
      }
      case "tool_result":
        return (
          <span className="text-zinc-600">
            <span className="font-semibold text-indigo-600">{(p.name as string) ?? ""}</span> 返回：
            <span
              className="ml-1 inline-block max-w-[90%] truncate align-bottom font-mono text-[11px] text-zinc-400"
              title={String(p.result)}
            >
              {String(p.result)}
            </span>
          </span>
        )
      case "log":
        return <span className="text-zinc-500">📝 {(p.message as string) ?? JSON.stringify(p)}</span>
      case "task_done":
        return <span className="font-bold text-emerald-600">✓ 完成</span>
      case "task_failed":
        return <span className="font-bold text-rose-600">✗ 失败：{(p.error as string) ?? ""}</span>
      case "task_cancelled":
        return <span className="font-bold text-zinc-500">⏹ 已取消</span>
      default:
        return <span className="text-zinc-400">{item.type}: {JSON.stringify(p)}</span>
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link href="/agent" className="text-xs text-zinc-400 hover:text-zinc-600">← 返回任务列表</Link>

      <div className="mt-3 mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-sm font-bold">{taskId}</h1>
          {st && (
            <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
              {st.label}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {(task?.status === "pending" || task?.status === "running") && (
            <button
              onClick={cancel}
              disabled={canceling}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:border-rose-200 hover:text-rose-500 disabled:opacity-50"
            >
              {canceling ? "取消中…" : "取消任务"}
            </button>
          )}
          {task?.status === "failed" && (
            <button
              onClick={retry}
              disabled={retrying}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {retrying ? "重试中…" : "重试"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

      {task && (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-xs">
          <div><span className="text-zinc-400">类型：</span><span className="font-mono">{task.type}</span></div>
          <div><span className="text-zinc-400">创建：</span><span className="font-mono">{fmtTime(task.createdAt)}</span></div>
          <div className="col-span-2"><span className="text-zinc-400">输入：</span><span className="font-mono break-all">{task.input}</span></div>
          <div className="col-span-2"><span className="text-zinc-400">结果：</span><span className="font-mono break-all">{task.result ?? "—"}</span></div>
        </div>
      )}

      <div ref={listRef} className="h-[50vh] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
        {timeline.length === 0 && <p className="py-10 text-center text-xs text-zinc-400">等待事件…（订阅中）</p>}
        <ol className="space-y-2">
          {timeline.map((item) => (
            <li key={item.seq} className="flex gap-2 rounded-lg bg-white px-3 py-2 text-xs shadow-xs">
              <span className="w-14 shrink-0 font-mono text-[10px] text-zinc-300">{fmtTime(item.time)}</span>
              <span className="min-w-0">{renderEvent(item)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
