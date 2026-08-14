// app/(main)/agent/page.tsx —— Agent 控制台占位页：任务列表 + 提交 echo 演示任务
"use client"

import { useCallback, useEffect, useState } from "react"
import type { TaskRow } from "@/runtime/shared/types"

export default function AgentPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/tasks", { cache: "no-store" })
      if (!res.ok) throw new Error("Runtime 不可用")
      const data = await res.json()
      if (Array.isArray(data)) {
        setTasks(data)
        setError(null)
      }
    } catch {
      setError("无法连接 Agent Runtime，请先运行 npm run dev:runtime")
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 3000)
    return () => clearInterval(timer)
  }, [refresh])

  const submit = async () => {
    setError(null)
    try {
      const res = await fetch("/api/agent/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "echo", input: { message: message || "hello", delayMs: 500 } }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "提交失败")
      }
      setMessage("")
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const statusColor: Record<string, string> = {
    pending: "bg-zinc-200 text-zinc-700",
    running: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700",
    cancelled: "bg-zinc-200 text-zinc-500",
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <h1 className="text-lg font-bold mb-4">Agent 控制台（P1 骨架）</h1>

      <div className="flex gap-2 mb-6">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="echo 消息内容"
          className="flex-1 h-9 rounded-lg border border-zinc-300 px-3 text-sm"
        />
        <button
          onClick={submit}
          className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white"
        >
          提交测试任务
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColor[t.status] ?? "bg-zinc-100"}`}>
              {t.status}
            </span>
            <span className="font-mono text-xs text-zinc-500">{t.type}</span>
            <span className="flex-1 truncate text-zinc-700">{t.input}</span>
            <span className="font-mono text-xs text-zinc-400">{t.stage}</span>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">暂无任务</p>
        )}
      </div>
    </div>
  )
}
