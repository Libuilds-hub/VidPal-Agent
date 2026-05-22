"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SparklesIcon, NetworkIcon, LightbulbIcon, ArrowRightIcon, ClockIcon } from "lucide-react"

export default function KnowledgeGraphPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            <ClockIcon className="size-3" />
            即将推出
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">知识图谱</h1>
          <p className="text-sm text-muted-foreground">
            跨视频的知识关联网络，自动发现概念之间的联系
          </p>
        </div>

        {/* Concept graph illustration */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-10">
              <svg
                viewBox="0 0 600 320"
                className="w-full max-w-lg"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Edges */}
                <line x1="300" y1="160" x2="180" y2="80" stroke="oklch(0.48 0.18 265 / 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
                <line x1="300" y1="160" x2="460" y2="60" stroke="oklch(0.48 0.18 265 / 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
                <line x1="300" y1="160" x2="140" y2="200" stroke="oklch(0.48 0.18 265 / 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
                <line x1="300" y1="160" x2="420" y2="220" stroke="oklch(0.48 0.18 265 / 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
                <line x1="300" y1="160" x2="300" y2="280" stroke="oklch(0.48 0.18 265 / 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
                <line x1="180" y1="80" x2="120" y2="40" stroke="oklch(0.55 0.15 180 / 0.3)" strokeWidth="1" strokeDasharray="4 3" />
                <line x1="180" y1="80" x2="200" y2="30" stroke="oklch(0.55 0.15 180 / 0.3)" strokeWidth="1" strokeDasharray="4 3" />
                <line x1="460" y1="60" x2="520" y2="30" stroke="oklch(0.65 0.18 85 / 0.3)" strokeWidth="1" strokeDasharray="4 3" />
                <line x1="460" y1="60" x2="500" y2="100" stroke="oklch(0.65 0.18 85 / 0.3)" strokeWidth="1" strokeDasharray="4 3" />
                <line x1="140" y1="200" x2="80" y2="180" stroke="oklch(0.50 0.12 340 / 0.3)" strokeWidth="1" strokeDasharray="4 3" />
                <line x1="420" y1="220" x2="500" y2="240" stroke="oklch(0.55 0.08 130 / 0.3)" strokeWidth="1" strokeDasharray="4 3" />

                {/* Central node */}
                <circle cx="300" cy="160" r="32" fill="oklch(0.48 0.18 265 / 0.12)" stroke="oklch(0.48 0.18 265 / 0.5)" strokeWidth="2" />
                <text x="300" y="156" textAnchor="middle" className="fill-primary text-[11px] font-semibold" style={{ fill: "oklch(0.48 0.18 265)" }}>RAG</text>
                <text x="300" y="170" textAnchor="middle" className="fill-muted-foreground text-[9px]" style={{ fill: "oklch(0.50 0.02 95)" }}>检索增强生成</text>

                {/* Connected nodes */}
                <circle cx="180" cy="80" r="24" fill="oklch(0.55 0.15 180 / 0.10)" stroke="oklch(0.55 0.15 180 / 0.4)" strokeWidth="1.5" />
                <text x="180" y="84" textAnchor="middle" className="text-[10px] font-medium" style={{ fill: "oklch(0.55 0.15 180)" }}>Embedding</text>

                <circle cx="460" cy="60" r="24" fill="oklch(0.65 0.18 85 / 0.10)" stroke="oklch(0.65 0.18 85 / 0.4)" strokeWidth="1.5" />
                <text x="460" y="64" textAnchor="middle" className="text-[10px] font-medium" style={{ fill: "oklch(0.65 0.18 85)" }}>向量数据库</text>

                <circle cx="140" cy="200" r="22" fill="oklch(0.50 0.12 340 / 0.10)" stroke="oklch(0.50 0.12 340 / 0.4)" strokeWidth="1.5" />
                <text x="140" y="204" textAnchor="middle" className="text-[10px] font-medium" style={{ fill: "oklch(0.50 0.12 340)" }}>Chunk 策略</text>

                <circle cx="420" cy="220" r="22" fill="oklch(0.55 0.08 130 / 0.10)" stroke="oklch(0.55 0.08 130 / 0.4)" strokeWidth="1.5" />
                <text x="420" y="224" textAnchor="middle" className="text-[10px] font-medium" style={{ fill: "oklch(0.55 0.08 130)" }}>检索策略</text>

                <circle cx="300" cy="280" r="22" fill="oklch(0.55 0.15 180 / 0.10)" stroke="oklch(0.55 0.15 180 / 0.4)" strokeWidth="1.5" />
                <text x="300" y="284" textAnchor="middle" className="text-[10px] font-medium" style={{ fill: "oklch(0.55 0.15 180)" }}>语义搜索</text>

                {/* Leaf nodes */}
                <circle cx="120" cy="40" r="16" fill="oklch(0.55 0.15 180 / 0.06)" stroke="oklch(0.55 0.15 180 / 0.25)" strokeWidth="1" />
                <text x="120" y="43" textAnchor="middle" className="text-[9px]" style={{ fill: "oklch(0.55 0.15 180 / 0.7)" }}>text-embedding</text>

                <circle cx="200" cy="30" r="16" fill="oklch(0.55 0.15 180 / 0.06)" stroke="oklch(0.55 0.15 180 / 0.25)" strokeWidth="1" />
                <text x="200" y="43" textAnchor="middle" className="text-[9px]" style={{ fill: "oklch(0.55 0.15 180 / 0.7)" }}>模型对比</text>

                <circle cx="520" cy="30" r="16" fill="oklch(0.65 0.18 85 / 0.06)" stroke="oklch(0.65 0.18 85 / 0.25)" strokeWidth="1" />
                <text x="520" y="43" textAnchor="middle" className="text-[9px]" style={{ fill: "oklch(0.65 0.18 85 / 0.7)" }}>Pinecone</text>

                <circle cx="500" cy="100" r="16" fill="oklch(0.65 0.18 85 / 0.06)" stroke="oklch(0.65 0.18 85 / 0.25)" strokeWidth="1" />
                <text x="500" y="103" textAnchor="middle" className="text-[9px]" style={{ fill: "oklch(0.65 0.18 85 / 0.7)" }}>Milvus</text>

                <circle cx="80" cy="180" r="16" fill="oklch(0.50 0.12 340 / 0.06)" stroke="oklch(0.50 0.12 340 / 0.25)" strokeWidth="1" />
                <text x="80" y="183" textAnchor="middle" className="text-[9px]" style={{ fill: "oklch(0.50 0.12 340 / 0.7)" }}>固定大小</text>

                <circle cx="500" cy="240" r="16" fill="oklch(0.55 0.08 130 / 0.06)" stroke="oklch(0.55 0.08 130 / 0.25)" strokeWidth="1" />
                <text x="500" y="243" textAnchor="middle" className="text-[9px]" style={{ fill: "oklch(0.55 0.08 130 / 0.7)" }}>BM25</text>

                {/* Source indicators */}
                <rect x="80" y="260" width="20" height="14" rx="7" fill="oklch(1 0 0)" stroke="oklch(0.91 0.012 95 / 0.8)" strokeWidth="1" />
                <text x="90" y="271" textAnchor="middle" className="text-[8px] font-medium" style={{ fill: "oklch(0.50 0.02 95)" }}>📺</text>
                <text x="105" y="272" className="text-[9px]" style={{ fill: "oklch(0.50 0.02 95)" }}>来自 3 个视频</text>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Feature cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <NetworkIcon className="size-[18px] text-primary" />
              </div>
              <CardTitle className="mt-2">自动关联</CardTitle>
              <CardDescription>
                AI 自动从视频中抽取关键概念，识别跨视频的知识关联，让散落的知识自动编织成网
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <LightbulbIcon className="size-[18px] text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="mt-2">发现缺口</CardTitle>
              <CardDescription>
                图谱中的稀疏区域就是你的知识盲区，智能推荐帮你系统性地完善知识结构
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <ArrowRightIcon className="size-[18px] text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="mt-2">跳转溯源</CardTitle>
              <CardDescription>
                点击任意概念节点，直接跳转到对应视频的精确时间点，复习原始内容只需一键
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-indigo-50/50 to-transparent p-6 dark:from-indigo-950/20 text-center">
          <SparklesIcon className="mx-auto mb-3 size-6 text-primary/60" />
          <p className="text-sm font-medium text-foreground">
            知识图谱正在建设中，届时将自动分析你已入库的所有视频
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            现在开始添加视频，为你的知识图谱积累数据
          </p>
        </div>
      </div>
    </div>
  )
}
