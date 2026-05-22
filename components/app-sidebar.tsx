"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { SettingsNavContent } from "@/components/settings-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  VideoIcon,
  PlusIcon,
  LibraryIcon,
  FolderIcon,
  SettingsIcon,
  HelpCircleIcon,
  SparklesIcon,
  Globe,
  Bot,
  FlaskConical,
} from "lucide-react"
import { onSettingsNav } from "@/lib/settings-events"

const navMainItems = [
  { title: "仪表盘", url: "/dashboard", icon: VideoIcon },
  { title: "添加视频", url: "/videos/new", icon: PlusIcon },
  { title: "视频库", url: "/videos", icon: LibraryIcon },
  { title: "合集", url: "/collections", icon: FolderIcon },
]

const navSecondaryItems = [
  { title: "设置", url: "/settings", icon: SettingsIcon },
  { title: "帮助", url: "/help", icon: HelpCircleIcon },
]

const settingsNavItems = [
  { id: "general", label: "常规", icon: SettingsIcon },
  { id: "llm", label: "AI / LLM", icon: Bot },
  { id: "source", label: "视频源", icon: Globe },
  { id: "experimental", label: "实验性", icon: FlaskConical },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const isSettings = pathname.startsWith("/settings")
  const [activeSection, setActiveSection] = React.useState("general")

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
            <SidebarSeparator className="mx-3 my-2" />
            <NavSecondary items={navSecondaryItems} pathname={pathname} />
          </>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
