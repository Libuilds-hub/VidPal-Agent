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
      <div className="flex flex-col gap-6 px-6 py-8">
        {/* Stats row - existing */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">视频总数</CardTitle>
              <VideoIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">暂无视频</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成分析</CardTitle>
              <BrainIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">等待添加视频</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总时长</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 分钟</div>
              <p className="text-xs text-muted-foreground">暂无记录</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学习进度</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">开始学习之旅</p>
            </CardContent>
          </Card>
        </div>

        {/* Two-column layout: knowledge gaps + agent recommendations */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Knowledge gaps */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <LightbulbIcon className="size-[15px] text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-sm">知识状态</CardTitle>
              </div>
              <CardDescription>你的学习主题掌握情况</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {learningTopics.map((topic) => (
                <div key={topic.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{topic.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {topic.totalVideos} 个视频 · {topic.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        topic.progress >= 70
                          ? "bg-emerald-500"
                          : topic.progress >= 40
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                      )}
                      style={{ width: `${topic.progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    知识缺口：{topic.gap}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Agent recommendations */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <BotIcon className="size-[15px] text-primary" />
                </div>
                <CardTitle className="text-sm">Agent 推荐</CardTitle>
              </div>
              <CardDescription>根据知识缺口为你推荐</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedVideos.map((video) => (
                <Link
                  key={video.id}
                  href="/videos/new"
                  className="group flex gap-3 rounded-lg p-2 -mx-2 transition-all duration-200 hover:bg-muted/70"
                >
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    <div className="flex h-full w-full items-center justify-center">
                      <VideoIcon className="size-5 text-muted-foreground/30" />
                    </div>
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
                      {video.duration}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <p className="truncate text-[13px] font-medium group-hover:text-primary transition-colors">
                      {video.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-[9px] font-medium",
                          video.source === "bilibili"
                            ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {video.source === "bilibili" ? "B站" : "YouTube"}
                      </span>
                      <span>{video.reason}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">最近动态</CardTitle>
            <CardDescription>你的学习足迹</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 py-2.5",
                    i < recentActivity.length - 1 && "border-b border-border/40"
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <item.icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <p className="min-w-0 flex-1 text-[13px]">
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    <span className="font-medium">{item.target}</span>
                  </p>
                  <span className="text-[11px] text-muted-foreground/60">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/ai-assistant"
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <BotIcon className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium">AI 助手</p>
              <p className="text-[11px] text-muted-foreground">搜索视频、跨视频对话</p>
            </div>
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground/30 group-hover:text-primary/70 transition-colors" />
          </Link>

          <Link
            href="/knowledge-graph"
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20">
              <GitGraphIcon className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium">知识图谱</p>
              <p className="text-[11px] text-muted-foreground">即将推出</p>
            </div>
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground/30 group-hover:text-primary/70 transition-colors" />
          </Link>

          <Link
            href="/videos"
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20">
              <VideoIcon className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium">视频库</p>
              <p className="text-[11px] text-muted-foreground">管理已分析的视频</p>
            </div>
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground/30 group-hover:text-primary/70 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}
