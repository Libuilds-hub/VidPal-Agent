"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { SettingsNavContent } from "@/components/settings-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import {
  LayoutDashboardIcon,
  BotIcon,
  LibraryIcon,
  GitGraphIcon,
  FolderHeartIcon,
  PenLineIcon,
  SparklesIcon,
  HelpCircleIcon,
  UserCircle,
  SlidersHorizontal,
  Database,
  Plug,
  RefreshCw,
  Key,
} from "lucide-react"
import { onSettingsNav } from "@/lib/settings-events"

const navGroups = [
  {
    label: "工作空间",
    items: [
      { title: "仪表盘", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "AI 助手", url: "/ai-assistant", icon: BotIcon },
      { title: "知识图谱", url: "/knowledge-graph", icon: GitGraphIcon },
    ],
  },
  {
    label: "内容管理",
    items: [
      { title: "视频库", url: "/videos", icon: LibraryIcon },
      { title: "合集", url: "/collections", icon: FolderHeartIcon },
    ],
  },
]

const settingsNavItems = [
  { id: "profile", label: "个人信息", icon: UserCircle },
  { id: "preferences", label: "偏好设置", icon: SlidersHorizontal },
  { id: "llm", label: "LLM API", icon: BotIcon },
  { id: "ai", label: "AI & Agent", icon: SparklesIcon },
  { id: "storage", label: "存储配置", icon: Database },
  { id: "cookies", label: "Cookie 配置", icon: Key },
  { id: "integrations", label: "集成", icon: Plug },
  { id: "help", label: "帮助", icon: HelpCircleIcon },
  { id: "updates", label: "更新", icon: RefreshCw },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const isSettings = pathname.startsWith("/settings")
  const [activeSection, setActiveSection] = React.useState("profile")

  React.useEffect(() => {
    return onSettingsNav(setActiveSection)
  }, [])

  return (
    <Sidebar variant="inset" {...props}>
      {!isSettings && (
        <SidebarHeader className="px-3 pt-3 pb-1.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="hover:bg-transparent! data-active:bg-transparent!">
                <a href="/dashboard" className="flex items-center gap-2.5! group select-none">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-900/5 dark:bg-zinc-100/10 border border-zinc-200/50 dark:border-zinc-800/60 text-foreground transition-all duration-200">
                    <SparklesIcon className="size-4 text-foreground/80" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-semibold text-[14px] tracking-tight text-foreground/90">视频总结分析</span>
                    <span className="truncate text-[11px] text-muted-foreground/60 font-medium tracking-wide">AI 学习助手</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      )}

      <SidebarContent className="px-2 scrollbar-hide">
        {isSettings ? (
          <SettingsNavContent items={settingsNavItems} activeId={activeSection} />
        ) : (
          <>
            <NavMain groups={navGroups} pathname={pathname} />
          </>
        )}
      </SidebarContent>

      {!isSettings && (
        <SidebarFooter className="px-2 pb-2">
          <NavUser user={{ name: "Admin", email: "admin@example.com", avatar: "" }} />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
