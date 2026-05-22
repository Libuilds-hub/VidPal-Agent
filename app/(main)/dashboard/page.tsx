import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VideoIcon, BrainIcon, TrendingUpIcon, ClockIcon, ArrowRightIcon, GitGraphIcon, BotIcon, LightbulbIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const learningTopics = [
  { name: "Claude Code", progress: 58, totalVideos: 4, gap: "Hook 实战案例" },
  { name: "RAG 技术", progress: 35, totalVideos: 3, gap: "Embedding 模型选择" },
  { name: "MCP 协议", progress: 72, totalVideos: 2, gap: "多 Agent 通信" },
]

const recommendedVideos = [
  {
    id: "r1",
    title: "Claude Code Hook 系统实战：从零搭建自动化工作流",
    source: "bilibili" as const,
    duration: "32:15",
    reason: "弥补 Hook 实战案例缺口",
  },
  {
    id: "r2",
    title: "Embedding 模型选型指南：OpenAI vs Cohere vs 开源方案",
    source: "youtube" as const,
    duration: "18:50",
    reason: "填补 Embedding 知识空白",
  },
  {
    id: "r3",
    title: "Agent 间通信模式：发布订阅 vs 请求响应",
    source: "bilibili" as const,
    duration: "26:40",
    reason: "衔接上周 MCP 学习路径",
  },
]

const recentActivity = [
  { action: "完成了", target: "MCP 协议深入解析", time: "2 小时前", icon: VideoIcon },
  { action: "在", target: "RAG 应用实战", time: "昨天 15:30", icon: BrainIcon },
  { action: "和 Agent 讨论了", target: "Chunk 策略最佳实践", time: "昨天 10:12", icon: BotIcon },
  { action: "添加了", target: "Claude Code Hook 系统", time: "2 天前", icon: VideoIcon },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-6 max-w-6xl w-full mx-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-1 select-none">
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground/90">工作空间仪表盘</h1>
          <p className="text-xs text-muted-foreground/80">概览个人视频库分析状态与当前知识状态</p>
        </div>

        {/* Stats Grid - Divided Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-border/45 bg-card/55 rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-1.5 p-4.5">
            <span className="text-[11px] font-medium text-muted-foreground/75 uppercase tracking-wider">视频总数</span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold tracking-tight leading-none">0</span>
              <span className="text-xs text-muted-foreground/60">暂无视频</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-4.5">
            <span className="text-[11px] font-medium text-muted-foreground/75 uppercase tracking-wider">已完成分析</span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold tracking-tight leading-none">0</span>
              <span className="text-xs text-muted-foreground/60">等待添加</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-4.5">
            <span className="text-[11px] font-medium text-muted-foreground/75 uppercase tracking-wider">分析总时长</span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold tracking-tight leading-none font-mono">0</span>
              <span className="text-xs text-muted-foreground/60">分钟</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-4.5">
            <span className="text-[11px] font-medium text-muted-foreground/75 uppercase tracking-wider">学习总进度</span>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold tracking-tight leading-none font-mono">0%</span>
              <span className="text-xs text-muted-foreground/60">开始学习之旅</span>
            </div>
          </div>
        </div>

        {/* Two-column layout: knowledge gaps + agent recommendations */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Knowledge gaps */}
          <div className="flex flex-col rounded-lg border border-border/45 bg-card/40 p-4.5">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2">
                <LightbulbIcon className="size-4 text-amber-500/80 dark:text-amber-400/80" />
                <h2 className="text-xs font-semibold text-foreground/90">知识主题掌握情况</h2>
              </div>
              <span className="text-[10px] text-muted-foreground/60">实时进度</span>
            </div>
            <div className="space-y-4">
              {learningTopics.map((topic) => (
                <div key={topic.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground/80">{topic.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {topic.totalVideos} 个视频 · {topic.progress}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        topic.progress >= 70
                          ? "bg-emerald-500/80 dark:bg-emerald-500/70"
                          : topic.progress >= 40
                            ? "bg-amber-500/80 dark:bg-amber-500/70"
                            : "bg-primary/80 dark:bg-primary/70"
                      )}
                      style={{ width: `${topic.progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 font-light">
                    缺口：{topic.gap}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Agent recommendations */}
          <div className="flex flex-col rounded-lg border border-border/45 bg-card/40 p-4.5">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <BotIcon className="size-4 text-primary/80" />
                <h2 className="text-xs font-semibold text-foreground/90">学习建议 & 推荐</h2>
              </div>
              <span className="text-[10px] text-muted-foreground/60">根据知识缺口计算</span>
            </div>
            <div className="space-y-2.5">
              {recommendedVideos.map((video) => (
                <Link
                  key={video.id}
                  href="/videos/new"
                  className="group flex gap-3 rounded border border-border/30 hover:border-border/60 bg-muted/20 hover:bg-muted/40 p-2 transition-all duration-150"
                >
                  <div className="relative h-11 w-20 shrink-0 overflow-hidden rounded bg-muted/80 flex items-center justify-center border border-border/10">
                    <VideoIcon className="size-4.5 text-muted-foreground/35" />
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-0.5 py-[1px] text-[8px] font-mono text-white/95">
                      {video.duration}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <p className="truncate text-[12px] font-medium text-foreground/85 group-hover:text-primary transition-colors leading-tight">
                      {video.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/75">
                      <span
                        className={cn(
                          "rounded-sm px-1 py-[1px] text-[8px] font-mono",
                          video.source === "bilibili"
                            ? "bg-pink-950/20 text-pink-500 dark:text-pink-400/90 border border-pink-500/10"
                            : "bg-red-950/20 text-red-500 dark:text-red-400/90 border border-red-500/10"
                        )}
                      >
                        {video.source === "bilibili" ? "B站" : "YouTube"}
                      </span>
                      <span className="truncate">{video.reason}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="flex flex-col rounded-lg border border-border/45 bg-card/40 p-4.5">
          <div className="pb-3 select-none">
            <h2 className="text-xs font-semibold text-foreground/90">最近动态</h2>
            <p className="text-[10px] text-muted-foreground/60">最近分析记录与学习记录</p>
          </div>
          <div className="divide-y divide-border/30">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 text-xs transition-colors duration-100 hover:bg-muted/10"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted/50 border border-border/30 text-muted-foreground/70">
                  <item.icon className="size-3" />
                </div>
                <p className="min-w-0 flex-1 text-foreground/80 leading-none">
                  <span className="text-muted-foreground/75">{item.action}</span>{" "}
                  <span className="font-medium text-foreground/85">{item.target}</span>
                </p>
                <span className="text-[10px] text-muted-foreground/50 shrink-0 font-mono">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions - Minimal outline tiles */}
        
      </div>
    </div>
  )
}
