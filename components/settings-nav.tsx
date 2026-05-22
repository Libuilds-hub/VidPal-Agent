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
      {/* Back button */}
      <div className="px-2 pt-1 pb-1">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-[13px] text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40 transition-all duration-200"
        >
          <ArrowLeft className="size-[15px] text-muted-foreground/40" />
          <span>{backLabel}</span>
        </Link>
      </div>

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
                    isActive={isActive}
                    onClick={() => navigateSettings(item.id)}
                    className={cn(
                      "group relative transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-[18px] transition-all duration-200",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/50 group-hover:text-muted-foreground/80"
                      )}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-300" />
                    )}
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
