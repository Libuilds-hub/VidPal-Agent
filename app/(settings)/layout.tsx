"use client"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { SettingsSidebar } from "@/components/settings/settings-sidebar"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

const sectionTitles: Record<string, string> = {
  "/settings/profile": "个人信息",
  "/settings/preferences": "偏好设置",
  "/settings/llm": "AI 供应商",
  "/settings/ai": "AI & Agent",
  "/settings/assistant": "AI 助手",
  "/settings/storage": "存储配置",
  "/settings/cookies": "Cookie 配置",
  "/settings/integrations": "集成合作",
  "/settings/help": "使用与帮助",
  "/settings/updates": "更新日志",
}

const sectionDescriptions: Record<string, string> = {
  "/settings/profile": "管理您的基本账户和安全信息",
  "/settings/preferences": "定制界面的个性化展现与转写默认值",
  "/settings/llm": "配置 AI 辅助模型连接与测试 API 状态",
  "/settings/ai": "自动化调度与辅助 Agent 参数配置",
  "/settings/assistant": "自定义 AI 智能助手的名称与头像外观",
  "/settings/storage": "配置本地 SQLite 数据库及第三方工具的运行环境",
  "/settings/cookies": "配置解析和视频抓取的登录 Cookies 以支持更高清下载",
  "/settings/integrations": "连接飞书、Slack 或 GitHub 等办公协同插件",
  "/settings/help": "查看键盘快捷键与常见故障处理方法",
  "/settings/updates": "检查是否有新版本可用并回顾系统版本进化历程",
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const title = sectionTitles[pathname] || "设置"
  const description = sectionDescriptions[pathname] || ""

  return (
    <SidebarProvider>
      <SettingsSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-11 shrink-0 items-center gap-3 px-4 border-b border-border/45 bg-background/40 backdrop-blur-md select-none z-10">
          <SidebarTrigger className="size-7 rounded hover:bg-muted/70 text-muted-foreground/80 hover:text-foreground transition-all duration-150 [&>svg]:size-3.5" />
          <div className="h-4 w-px bg-border/40" />
          <div>
            <span className="text-[11px] font-medium text-muted-foreground/75 tracking-wider uppercase">{title}</span>
            {description && <span className="text-[10px] text-muted-foreground/50 ml-2 hidden sm:inline">{description}</span>}
          </div>
        </header>
        <div className={cn("flex flex-1 flex-col overflow-hidden bg-background")}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
