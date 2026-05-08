"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { VideoIcon, PlusIcon, LibraryIcon, FolderIcon, SettingsIcon, HelpCircleIcon } from "lucide-react"

const data = {
  navMain: [
    {
      title: "仪表盘",
      url: "/dashboard",
      icon: <VideoIcon />,
      isActive: true,
    },
    {
      title: "添加视频",
      url: "/videos/new",
      icon: <PlusIcon />,
    },
    {
      title: "视频库",
      url: "/videos",
      icon: <LibraryIcon />,
    },
    {
      title: "合集",
      url: "/collections",
      icon: <FolderIcon />,
    },
  ],
  navSecondary: [
    {
      title: "设置",
      url: "/settings",
      icon: <SettingsIcon />,
    },
    {
      title: "帮助",
      url: "/help",
      icon: <HelpCircleIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <VideoIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">视频总结分析</span>
                  <span className="truncate text-xs">智能学习助手</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
