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
  SettingsIcon,
} from "lucide-react"
import { onSettingsNav } from "@/lib/settings-events"

const navMainItems = [
  { title: "仪表盘", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "AI 助手", url: "/ai-assistant", icon: BotIcon },
  { title: "视频库", url: "/videos", icon: LibraryIcon },
  { title: "知识图谱", url: "/knowledge-graph", icon: GitGraphIcon },
  { title: "合集", url: "/collections", icon: FolderHeartIcon },
  { title: "笔记", url: "/notes", icon: PenLineIcon },
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
        <SidebarHeader className="px-3 pt-4 pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="hover:bg-transparent! data-active:bg-transparent!">
                <a href="/dashboard" className="flex items-center gap-3! group">
                  <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/20 transition-all duration-300 group-hover:shadow-md group-hover:shadow-indigo-500/30 group-hover:scale-105">
                    <SparklesIcon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-semibold text-[15px] tracking-tight">视频总结分析</span>
                    <span className="truncate text-[11px] text-muted-foreground/70 font-medium tracking-wide">AI 学习助手</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      )}

      <SidebarContent className="px-2">
        {isSettings ? (
          <SettingsNavContent items={settingsNavItems} activeId={activeSection} />
        ) : (
          <>
            <NavMain items={navMainItems} pathname={pathname} />
            <div className="mt-auto pt-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="设置"
                    className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                  >
                    <a href="/settings" className="flex items-center gap-2.5">
                      <SettingsIcon className="size-[18px] text-muted-foreground/40" />
                      <span>设置</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
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
