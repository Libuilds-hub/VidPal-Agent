"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { VidPalLogo } from "@/components/vidpal-logo"
import {
  Settings,
  UserCircle,
  SlidersHorizontal,
  Database,
  BotIcon,
  SparklesIcon,
  Key,
  Plug,
  HelpCircleIcon,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

const sidebarGroups = [
  {
    label: "常规设置",
    items: [
      { id: "profile", label: "个人信息", icon: UserCircle, href: "/settings/profile" },
      { id: "preferences", label: "偏好设置", icon: SlidersHorizontal, href: "/settings/preferences" },
      { id: "storage", label: "存储配置", icon: Database, href: "/settings/storage" },
    ],
  },
  {
    label: "AI 服务与连接",
    items: [
      { id: "llm", label: "AI 供应商", icon: BotIcon, href: "/settings/llm" },
      { id: "ai", label: "AI & Agent", icon: SparklesIcon, href: "/settings/ai" },
      { id: "assistant", label: "AI 助手", icon: BotIcon, href: "/settings/assistant" },
      { id: "cookies", label: "Cookie 配置", icon: Key, href: "/settings/cookies" },
      { id: "integrations", label: "集成合作", icon: Plug, href: "/settings/integrations" },
    ],
  },
  {
    label: "系统支持",
    items: [
      { id: "help", label: "使用与帮助", icon: HelpCircleIcon, href: "/settings/help" },
      { id: "updates", label: "更新日志", icon: RefreshCw, href: "/settings/updates" },
    ],
  },
]

export function SettingsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        {/* Back button */}
        <div className="px-2 pt-1 pb-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-md px-1.5 py-1 text-[13.5px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/40 transition-all duration-200 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-1"
          >
            <ArrowLeft className="size-4 text-muted-foreground/50" />
            <span className="group-data-[collapsible=icon]:hidden">返回主界面</span>
          </Link>
        </div>

        {/* Section groups */}
        <div className="space-y-4 mt-2">
          {sidebarGroups.map((group) => (
            <SidebarGroup key={group.label} className="px-0 py-0">
              <SidebarGroupLabel className="px-3 text-[11px] uppercase tracking-wider font-semibold text-sidebar-foreground/40 mb-1.5 transition-opacity duration-200">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(
                            "group relative transition-all duration-150 py-1.5 h-8.5 text-[13.5px] rounded select-none",
                            isActive
                              ? "bg-sidebar-accent/70 text-foreground font-semibold"
                              : "text-muted-foreground/65 hover:bg-transparent! hover:text-muted-foreground/65!"
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-2.5! pl-3 group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:justify-center">
                            <item.icon className={cn(
                              "size-4 transition-colors duration-150",
                              isActive ? "text-foreground" : "text-muted-foreground/45"
                            )} />
                            <span className="tracking-wide group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
