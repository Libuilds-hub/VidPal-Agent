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
  LibraryIcon,
  GitGraphIcon,
  FolderHeartIcon,
  History as HistoryIcon,
  MessageSquarePlusIcon,
  BotIcon,
} from "lucide-react"
import { VidPalLogo } from "@/components/vidpal-logo"

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
      { title: "新对话", url: "/ai-assistant/new-chat", icon: MessageSquarePlusIcon },
      { title: "历史对话", url: "/ai-assistant/history", icon: HistoryIcon },
      { title: "Agent 控制台", url: "/agent", icon: BotIcon },
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
      <SidebarHeader className="px-3 py-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-transparent! data-active:bg-transparent! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:p-0!">
              <a href="/dashboard" className="flex items-center gap-2.5! group select-none [&_svg]:!size-auto">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-900 text-blue-400 transition-all duration-200">
                  <VidPalLogo className="!size-8" />
                </div>
                <span className="inline-block h-8 leading-8 truncate font-extralight text-2xl tracking-wider bg-gradient-to-b from-zinc-900 to-zinc-900/60 dark:from-white dark:to-white/60 bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">VidPal</span>
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

