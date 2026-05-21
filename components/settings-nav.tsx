"use client"

import Link from "next/link"
import { type LucideIcon, ArrowLeft } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { navigateSettings } from "@/lib/settings-events"

export type SettingsNavItem = {
  id: string
  label: string
  icon: LucideIcon
}

export function SettingsNavContent({
  items,
  activeId,
  backHref = "/dashboard",
  backLabel = "返回工作台",
}: {
  items: SettingsNavItem[]
  activeId: string
  backHref?: string
  backLabel?: string
}) {
  return (
    <>
      {/* Back to app */}
      <SidebarGroup className="px-0 pt-1">
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="sm"
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40 transition-all duration-200"
              >
                <Link href={backHref} className="flex items-center gap-2.5!">
                  <ArrowLeft className="size-[15px] text-muted-foreground/40" />
                  <span className="text-[13px]">{backLabel}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="mx-3 my-2" />

      {/* Settings nav items */}
      <SidebarGroup className="px-0">
        <SidebarGroupLabel className="px-2">设置</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {items.map((item) => {
              const isActive = activeId === item.id
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    size="sm"
                    isActive={isActive}
                    onClick={() => navigateSettings(item.id)}
                    className={cn(
                      "transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent/80 font-medium"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-[15px] transition-colors duration-200",
                        isActive ? "text-primary/80" : "text-muted-foreground/40"
                      )}
                    />
                    <span className="text-[13px]">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
