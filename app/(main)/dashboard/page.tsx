"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  VideoIcon,
  SearchIcon,
  ExternalLinkIcon,
  Loader2Icon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  HelpCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  GitGraphIcon,
  TrendingUpIcon,
  History as HistoryIcon,
  PlayIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Video {
  id: string
  title: string | null
  source: string
  url: string | null
  localPath: string | null
  duration: number | null
  thumbnail: string | null
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Chart states
  const [chartMetric, setChartMetric] = useState<"hours" | "count">("hours")
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const chartSvgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    fetchVideos()
    const interval = setInterval(fetchVideos, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/video")
      const data = await res.json()
      setVideos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch videos:", err)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  // Greeting based on hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 5) return "夜深了，终身学习者"
    if (hour < 9) return "早上好，终身学习者"
    if (hour < 12) return "上午好，终身学习者"
    if (hour < 14) return "中午好，终身学习者"
    if (hour < 18) return "下午好，终身学习者"
    return "晚上好，终身学习者"
  }, [])

  // Statistics calculation
  const stats = useMemo(() => {
    const total = videos.length
    const doneVideos = videos.filter((v) => v.status === "done")
    const doneCount = doneVideos.length
    const processingCount = videos.filter(
      (v) => v.status === "downloading" || v.status === "transcribing"
    ).length
    const errorCount = videos.filter((v) => v.status === "error").length

    // Duration (in seconds)
    const totalDurationSeconds = doneVideos.reduce((acc, v) => acc + (v.duration || 0), 0)
    const totalDurationHours = totalDurationSeconds > 0 ? totalDurationSeconds / 3600 : 0

    // Digest rate
    const digestRate = total > 0 ? Math.round((doneCount / total) * 100) : 0

    // Concept points calculation (simulated study nodes)
    const knowledgePoints = doneCount * 12 + processingCount * 3

    // Platform distribution
    const platforms = { bilibili: 0, youtube: 0, local: 0 }
    videos.forEach((v) => {
      if (v.source === "bilibili") platforms.bilibili++
      else if (v.source === "youtube") platforms.youtube++
      else platforms.local++
    })

    return {
      total,
      doneCount,
      processingCount,
      errorCount,
      totalDurationHours,
      digestRate,
      knowledgePoints,
      platforms,
    }
  }, [videos])

  // Custom Chart Data Generation (Past 7 Days)
  const chartData = useMemo(() => {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    const days = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateString = d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
      const dayName = weekdays[d.getDay()]
      
      // Calculate videos imported on this day
      const dayVideos = videos.filter((v) => {
        const videoDate = new Date(v.createdAt)
        return (
          videoDate.getFullYear() === d.getFullYear() &&
          videoDate.getMonth() === d.getMonth() &&
          videoDate.getDate() === d.getDate()
        )
      })

      const videoCount = dayVideos.length
      // Sum duration in hours (fallback to 0.4 hours if done video has no duration for rendering)
      const durationHours = dayVideos.reduce((acc, v) => {
        if (v.status === "done") {
          return acc + (v.duration ? v.duration / 3600 : 0.4)
        }
        return acc
      }, 0)

      days.push({
        dateStr: dateString,
        dayName,
        hours: Number(durationHours.toFixed(1)),
        count: videoCount,
        isDemo: false,
      })
    }

    // If no videos, provide a beautiful baseline demonstration curve
    const hasAnyActivity = days.some((d) => d.count > 0)
    if (!hasAnyActivity) {
      const demoHours = [0.8, 1.6, 1.2, 2.8, 1.5, 3.4, 2.2]
      const demoCounts = [1, 2, 1, 3, 2, 4, 2]
      return days.map((day, idx) => ({
        ...day,
        hours: demoHours[idx],
        count: demoCounts[idx],
        isDemo: true,
      }))
    }

    return days
  }, [videos])

  // Chart values mapper for SVG coordinates
  const svgCoordinates = useMemo(() => {
    const values = chartData.map((d) => (chartMetric === "hours" ? d.hours : d.count))
    const maxVal = Math.max(...values, 1.5) // Minimum max to prevent dividing by 0 or flat peaks

    const width = 460
    const height = 140
    const paddingLeft = 40
    const paddingRight = 15
    const paddingTop = 15
    const paddingBottom = 25

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    const points = chartData.map((d, i) => {
      const val = chartMetric === "hours" ? d.hours : d.count
      const x = paddingLeft + (i * chartWidth) / 6
      const y = paddingTop + chartHeight - (val / maxVal) * chartHeight
      return { x, y, value: val, date: d.dateStr, day: d.dayName }
    })

    // Generate SVG path using bezier curves
    let pathD = ""
    let areaD = ""

    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`
      areaD = `M ${points[0].x} ${paddingTop + chartHeight} L ${points[0].x} ${points[0].y}`

      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i]
        const next = points[i + 1]
        const cpX1 = curr.x + (next.x - curr.x) / 3.2
        const cpY1 = curr.y
        const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3.2
        const cpY2 = next.y

        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`
        areaD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`
      }
      areaD += ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`
    }

    return { points, pathD, areaD, chartHeight, paddingTop, paddingLeft, chartWidth }
  }, [chartData, chartMetric])

  // Handles mouse hover over the chart
  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartSvgRef.current) return
    const rect = chartSvgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left

    // Find the closest point index
    let closestIdx = 0
    let minDiff = Infinity

    svgCoordinates.points.forEach((p, idx) => {
      const diff = Math.abs(p.x - x)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = idx
      }
    })

    setHoveredChartIndex(closestIdx)
    setTooltipPos({
      x: svgCoordinates.points[closestIdx].x,
      y: svgCoordinates.points[closestIdx].y,
    })
  }

  const handleChartMouseLeave = () => {
    setHoveredChartIndex(null)
  }

  // Circular progress stroke calculation
  const radius = 16
  const strokeCircumference = 2 * Math.PI * radius
  const strokeDashoffset = strokeCircumference - (stats.digestRate / 100) * strokeCircumference

  // Filter out recent done / active learning videos (max 3)
  const recentVideos = useMemo(() => {
    return videos.slice(0, 3)
  }, [videos])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide bg-gradient-to-b from-zinc-50/20 via-background to-background dark:from-zinc-950/20">
      <div className="flex flex-col gap-6 px-6 py-6 max-w-6xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Dynamic Welcome Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30 p-6 sm:p-7 shadow-[0_2px_12px_rgba(99,102,241,0.06),0_0_0_1px_rgba(99,102,241,0.04)] select-none"
          style={{
            background: 'linear-gradient(135deg, rgba(238,242,255,0.5) 0%, rgba(224,231,255,0.25) 30%, rgba(248,250,255,0.15) 60%, rgba(255,255,255,0.05) 100%)',
          }}
        >
          {/* Decorative gradient orbs */}
          <div className="absolute -top-20 -right-16 size-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)' }} />
          <div className="absolute -bottom-24 left-1/4 size-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.02) 50%, transparent 70%)' }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="size-14 rounded-full overflow-hidden shrink-0">
              <img alt="logo" className="size-full object-cover" src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp" />
            </div>
            <div className="space-y-1">
              <h1 className="text-[20px] font-bold tracking-tight bg-gradient-to-r from-indigo-950 via-violet-900 to-zinc-800 dark:from-indigo-200 dark:via-violet-100 dark:to-zinc-100 text-transparent bg-clip-text">
                {greeting}，Admin
              </h1>
              <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-xl">
                您的智能学习助理已就绪。在这里查阅学习动力走势、核心知识关联度，以及大模型的音视频转化深度摘要。
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
          
          {/* Card 1: Library Size */}
          <Link href="/videos" className="block group">
            <Card className="relative overflow-hidden h-[96px] bg-card/45 border-zinc-200/50 dark:border-zinc-800/40 hover:border-zinc-400/40 transition-all duration-300 hover:shadow-xs cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between h-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">视频库规模</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-tight font-mono">{stats.total}</span>
                    <span className="text-[10px] text-muted-foreground">个</span>
                  </div>

                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-muted-foreground/80 group-hover:bg-foreground/5 group-hover:text-foreground transition-all duration-300 border border-zinc-200/20 dark:border-zinc-700/20">
                  <VideoIcon className="size-4.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 2: Knowledge Points */}
          <Link href="/knowledge-graph" className="block group">
            <Card className="relative overflow-hidden h-[96px] bg-card/45 border-zinc-200/50 dark:border-zinc-800/40 hover:border-zinc-400/40 transition-all duration-300 hover:shadow-xs cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between h-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">核心知识点</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-tight font-mono">{stats.knowledgePoints}</span>
                    <span className="text-[10px] text-muted-foreground">概念</span>
                  </div>

                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-muted-foreground/80 group-hover:bg-foreground/5 group-hover:text-foreground transition-all duration-300 border border-zinc-200/20 dark:border-zinc-700/20">
                  <GitGraphIcon className="size-4.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Card 3: Study Time & Heartbeat sparkline */}
          <Card className="relative overflow-hidden h-[96px] bg-card/45 border-zinc-200/50 dark:border-zinc-800/40 transition-all duration-300">
            <CardContent className="p-4 flex items-center justify-between h-full">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">系统学习时间</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight font-mono">{stats.totalDurationHours.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">小时</span>
                </div>

              </div>
              <div className="flex flex-col items-end gap-1 select-none">
                <svg className="w-14 h-7 text-zinc-400 dark:text-zinc-600 overflow-visible" viewBox="0 0 60 20" fill="none">
                  <path
                    d="M0,10 L12,10 L16,4 L20,16 L24,10 L36,10 L40,6 L44,14 L48,10 L60,10"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-[pulse_3s_infinite]"
                  />
                </svg>
                <span className="text-[8px] font-mono text-muted-foreground/45 tracking-wide scale-90">STUDY BEAT</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: AI Digest Rate */}
          <Card className="relative overflow-hidden h-[96px] bg-card/45 border-zinc-200/50 dark:border-zinc-800/40 transition-all duration-300">
            <CardContent className="p-4 flex items-center justify-between h-full">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">大模型转化率</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight font-mono">{stats.digestRate}</span>
                  <span className="text-[10px] text-muted-foreground">%</span>
                </div>

              </div>
              <div className="relative flex items-center justify-center scale-95 select-none">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    className="stroke-zinc-200/50 dark:stroke-zinc-800/50"
                    strokeWidth="3.2"
                    fill="transparent"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    className="stroke-zinc-800 dark:stroke-zinc-200 transition-all duration-500 ease-out"
                    strokeWidth="3.2"
                    fill="transparent"
                    strokeDasharray={strokeCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-foreground/80">
                  {stats.digestRate}%
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Dynamic Analytics & Info Cloud Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Custom Interactive SVG Chart */}
          <div className="lg:col-span-2 flex flex-col gap-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-card/35 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] relative select-none">
            <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800/30 pb-3">
              <div className="flex items-center gap-1.5 pb-0.5">
                <h3 className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">最近学习动力曲线</h3>
                {chartData[0]?.isDemo && (
                  <span className="rounded-xs bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 px-1 py-[0.5px] text-[7.5px] scale-90 font-medium">
                    效果展示数据
                  </span>
                )}
              </div>

              {/* Minimal Dual-Tab switch */}
              <div className="flex p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/30 dark:border-zinc-700/10">
                <button
                  onClick={() => setChartMetric("hours")}
                  className={cn(
                    "px-2 py-0.5 rounded-sm text-[9.5px] font-medium transition-all cursor-pointer",
                    chartMetric === "hours"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs"
                      : "text-muted-foreground/80 hover:text-foreground"
                  )}
                >
                  时长 (Hr)
                </button>
                <button
                  onClick={() => setChartMetric("count")}
                  className={cn(
                    "px-2 py-0.5 rounded-sm text-[9.5px] font-medium transition-all cursor-pointer",
                    chartMetric === "count"
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs"
                      : "text-muted-foreground/80 hover:text-foreground"
                  )}
                >
                  视频 (个)
                </button>
              </div>
            </div>

            {/* Custom SVG Drawing Area */}
            <div className="relative w-full h-[140px] mt-2 group/chart" style={{ touchAction: "none" }}>
              
              {/* Responsive SVG */}
              <svg
                ref={chartSvgRef}
                viewBox="0 0 460 140"
                className="w-full h-full overflow-visible"
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
                <defs>
                  {/* Glowing gray area gradient */}
                  <linearGradient id="grayGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                  const y = svgCoordinates.paddingTop + r * svgCoordinates.chartHeight
                  return (
                    <line
                      key={idx}
                      x1={svgCoordinates.paddingLeft}
                      y1={y}
                      x2={svgCoordinates.paddingLeft + svgCoordinates.chartWidth}
                      y2={y}
                      stroke="currentColor"
                      className="text-zinc-200/40 dark:text-zinc-800/30"
                      strokeWidth="0.75"
                    />
                  )
                })}

                {/* Area under the line */}
                <path d={svgCoordinates.areaD} fill="url(#grayGradient)" className="text-zinc-500/30 dark:text-zinc-400/20" />

                {/* The main Bezier trend line */}
                <path
                  d={svgCoordinates.pathD}
                  fill="none"
                  className="stroke-zinc-800 dark:stroke-zinc-200"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {svgCoordinates.points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    className={cn(
                      "fill-white dark:fill-zinc-950 stroke-zinc-800 transition-all duration-150",
                      hoveredChartIndex === idx ? "stroke-zinc-900 dark:stroke-white stroke-[3] r-5 scale-125" : "stroke-zinc-400 dark:stroke-zinc-600 stroke-[1.75]"
                    )}
                  />
                ))}

                {/* Interactive coordinate tracking line */}
                {hoveredChartIndex !== null && (
                  <line
                    x1={tooltipPos.x}
                    y1={svgCoordinates.paddingTop}
                    x2={tooltipPos.x}
                    y2={svgCoordinates.paddingTop + svgCoordinates.chartHeight}
                    stroke="currentColor"
                    className="text-zinc-400/30 dark:text-zinc-600/35"
                    strokeWidth="1.25"
                    strokeDasharray="4 3"
                  />
                )}

                {/* X Axis Labels */}
                {chartData.map((d, idx) => {
                  const x = svgCoordinates.paddingLeft + (idx * svgCoordinates.chartWidth) / 6
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={136}
                      textAnchor="middle"
                      className="fill-muted-foreground/60 text-[9px] font-mono select-none"
                    >
                      {d.dayName}
                    </text>
                  )
                })}
              </svg>

              {/* Absolute Glassmorphic Hover Tooltip */}
              {hoveredChartIndex !== null && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-[100%] rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-2.5 py-1.5 text-[10px] leading-tight font-medium shadow-md transition-all duration-75 flex flex-col z-20"
                  style={{
                    left: `${(tooltipPos.x / 460) * 100}%`,
                    top: `${(tooltipPos.y / 140) * 100 - 8}%`,
                  }}
                >
                  <span className="text-muted-foreground text-[8px] font-mono uppercase tracking-wider block">
                    {chartData[hoveredChartIndex].dateStr} · {chartData[hoveredChartIndex].dayName}
                  </span>
                  <span className="text-foreground/90 font-bold block mt-0.5 font-sans">
                    {chartMetric === "hours" ? (
                      <>学习时长: <span className="font-mono text-zinc-900 dark:text-zinc-100">{chartData[hoveredChartIndex].hours}</span> 小时</>
                    ) : (
                      <>分析视频: <span className="font-mono text-zinc-900 dark:text-zinc-100">{chartData[hoveredChartIndex].count}</span> 个</>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>


        </div>

        {/* Recent Study & Activity Section */}
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-card/35 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] select-none">
          <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800/30 pb-3.5">
            <h3 className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">最近研究进展</h3>
            <Link href="/videos" className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 hover:text-foreground hover:underline flex items-center gap-0.5">
              前往视频库
              <ArrowRightIcon className="size-3" />
            </Link>
          </div>

          {/* Skeletons or Empty States */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800/30 animate-pulse border border-border/30" />
              ))}
            </div>
          ) : recentVideos.length === 0 ? (
            /* Premium Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 bg-card/45 text-muted-foreground/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <BookOpenIcon className="size-5" />
              </div>
              <h4 className="text-xs font-semibold text-foreground/80">目前没有导入视频</h4>
              <p className="mt-1 max-w-xs text-[10px] text-muted-foreground/70 leading-relaxed">
                前往视频资源库贴入网页链接或上传本地视频，即刻生成交互式分析控制台。
              </p>
            </div>
          ) : (
            /* Cards Deck Grid (Replacing Recent Activities) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {recentVideos.map((video) => {
                const isDone = video.status === "done"
                const isProcessing = video.status === "downloading" || video.status === "transcribing"
                const isError = video.status === "error"

                // Badge configuration based on state
                let badgeClass = "text-zinc-500 bg-zinc-50 dark:bg-zinc-900/10 border-zinc-200/20 dark:border-zinc-800/20"
                let statusText = "待处理"
                let Dot = () => <span className="inline-block size-1.5 rounded-full bg-zinc-400 mr-1" />

                if (video.status === "downloading") {
                  badgeClass = "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-850 border-zinc-200/30 dark:border-zinc-700/30"
                  statusText = "下载中"
                  Dot = () => <span className="inline-block size-1.5 rounded-full bg-zinc-500 animate-ping mr-1" />
                } else if (video.status === "transcribing") {
                  badgeClass = "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-850 border-zinc-200/30 dark:border-zinc-700/30"
                  statusText = "转录分析中"
                  Dot = () => <span className="inline-block size-1.5 rounded-full bg-zinc-500 animate-pulse mr-1" />
                } else if (isDone) {
                  badgeClass = "text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50"
                  statusText = "解析已就绪"
                  Dot = () => <span className="inline-block size-1.5 rounded-full bg-zinc-850 dark:bg-zinc-150 mr-1" />
                } else if (isError) {
                  badgeClass = "text-zinc-500 bg-zinc-50 dark:bg-zinc-900/5 border-zinc-200/20 dark:border-zinc-800/15"
                  statusText = "处理失败"
                  Dot = () => <span className="inline-block size-1.5 rounded-full bg-zinc-400 mr-1 animate-bounce" />
                }

                // Platform badge helper
                const sourceBadge = (source: string) => {
                  const base = "rounded px-1.5 py-0.5 text-[8.5px] font-mono border uppercase tracking-wider font-semibold scale-90 origin-left"
                  if (source === "bilibili") return cn(base, "bg-zinc-500/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800")
                  if (source === "youtube") return cn(base, "bg-zinc-500/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800")
                  return cn(base, "bg-zinc-500/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800")
                }

                return (
                  <div
                    key={video.id}
                    onClick={() => isDone && router.push(`/videos/${video.id}`)}
                    className={cn(
                      "group relative flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-card/45 transition-all duration-300 overflow-hidden shadow-xs",
                      isDone ? "cursor-pointer hover:border-zinc-400/40 hover:shadow-xs" : "bg-zinc-100/5 dark:bg-zinc-900/5",
                      isProcessing && "opacity-95"
                    )}
                  >
                    {/* Left Accent Shimmer Bar on Done Hover */}
                    {isDone && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-zinc-400/30 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                    )}

                    {/* Left Thumbnail (Miniature Aspect-Video) */}
                    <div className="relative h-11 w-18 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/30 dark:border-zinc-700/20 flex items-center justify-center select-none">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title || "封面"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103 group-hover:brightness-105"
                        />
                      ) : (
                        <VideoIcon className="size-4 text-muted-foreground/35" />
                      )}
                      
                      {/* Play overlay */}
                      {isDone && (
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="h-6 w-6 rounded-full bg-white/95 dark:bg-zinc-950/90 shadow-md flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:scale-105 transition-transform duration-300">
                            <PlayIcon className="size-2.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/15 dark:bg-black/35 backdrop-blur-[0.5px] flex items-center justify-center">
                          <Loader2Icon className="size-4 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    {/* Right Info Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <h4 className="truncate text-xs font-semibold text-foreground/85 leading-tight group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                        {video.title || "未命名视频或解析中..."}
                      </h4>
                      
                      <div className="flex items-center gap-1.5 select-none overflow-hidden">
                        {/* Source badge */}
                        <span className={sourceBadge(video.source)}>
                          {video.source === "bilibili" ? "BiliBili" : video.source === "youtube" ? "YouTube" : "Local"}
                        </span>

                        {/* Status text badge (only show if not done) */}
                        {!isDone && (
                          <span className={cn("inline-flex items-center rounded-xs px-1 py-[0.5px] text-[8px] font-bold border scale-90 origin-left leading-none", badgeClass)}>
                            <Dot />
                            {statusText}
                          </span>
                        )}

                        {/* Date string */}
                        <span className="text-[8.5px] text-muted-foreground/45 font-mono ml-auto shrink-0 pr-0.5">
                          {formatDate(video.createdAt).split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
