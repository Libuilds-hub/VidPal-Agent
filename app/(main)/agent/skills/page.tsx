// app/(main)/agent/skills/page.tsx —— 技能管理：列表 + SKILL.md 查看
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createRuntimeClient } from "@/lib/runtime-client"

const runtime = createRuntimeClient()

interface SkillEntry {
  name: string
  description: string
  version: string
  default: boolean
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [content, setContent] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    runtime.listSkills().then(setSkills).catch((e) => setError(e instanceof Error ? e.message : "无法获取技能列表"))
  }, [])

  const toggle = async (name: string) => {
    if (expanded === name) {
      setExpanded(null)
      return
    }
    setExpanded(name)
    setContent("")
    try {
      const skill = await runtime.getSkill(name)
      setContent(skill.content)
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link href="/agent" className="text-xs text-zinc-400 hover:text-zinc-600">← 返回任务列表</Link>
      <h1 className="mt-3 mb-1 text-lg font-bold">技能管理</h1>
      <p className="mb-5 text-xs text-zinc-500">Agent 默认装载 default 技能（video-study），其余技能按需装载（V2）</p>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

      <div className="space-y-2">
        {skills.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">暂无技能</p>}
        {skills.map((s) => (
          <div key={s.name} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <button onClick={() => toggle(s.name)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{s.name}</span>
                  {s.default && (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-200">默认装载</span>
                  )}
                  <span className="font-mono text-[10px] text-zinc-400">v{s.version}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{s.description}</p>
              </div>
              <span className="text-xs text-zinc-400">{expanded === s.name ? "收起 ▲" : "查看 ▼"}</span>
            </button>
            {expanded === s.name && (
              <pre className="max-h-96 overflow-auto border-t border-zinc-100 bg-zinc-50/70 p-4 text-[11px] leading-relaxed text-zinc-600 whitespace-pre-wrap">
                {content || "加载中…"}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}