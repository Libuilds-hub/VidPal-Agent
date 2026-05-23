"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
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
  MessageSquareIcon,
  LibraryIcon,
  GitGraphIcon,
  FolderHeartIcon,
  SparklesIcon,
  History as HistoryIcon,
} from "lucide-react"

const navGroups = [
  {
    label: "",
    items: [
      { title: "仪表盘", url: "/dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "工作空间",
    items: [
      { title: "新对话", url: "/ai-assistant", icon: MessageSquareIcon },
      { title: "历史对话", url: "/ai-assistant/history", icon: HistoryIcon },
    ],
  },
  {
    label: "内容管理",
    items: [
      { title: "视频库", url: "/videos", icon: LibraryIcon },
      { title: "合集", url: "/collections", icon: FolderHeartIcon },
      { title: "知识图谱", url: "/knowledge-graph", icon: GitGraphIcon },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()


  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="px-3 pt-3 pb-1.5 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-transparent! data-active:bg-transparent! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:p-0!">
              <a href="/dashboard" className="flex items-center gap-2.5! group select-none">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-900/5 dark:bg-zinc-100/10 border border-zinc-200/50 dark:border-zinc-800/60 text-foreground transition-all duration-200">
                  <SparklesIcon className="size-4 text-foreground/80" />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-[14px] tracking-tight text-foreground/90">视频总结分析</span>
                  <span className="truncate text-[11px] text-muted-foreground/60 font-medium tracking-wide">AI 学习助手</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 scrollbar-hide">
        <NavMain groups={navGroups} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter className="px-2 pb-2">
        <NavUser user={{ name: "Admin", email: "admin@example.com", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}

