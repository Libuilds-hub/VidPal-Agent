"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import {
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
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5! group select-none"
              >
                <ArrowLeft className="size-4 text-muted-foreground/50" />
                <span className="text-[13.5px] font-medium text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">返回主界面</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 scrollbar-hide">
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
