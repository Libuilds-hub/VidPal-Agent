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
  backLabel = "返回工作空间",
}: {
  items: SettingsNavItem[]
  activeId: string
  backHref?: string
  backLabel?: string
}) {
  return (
    <>
      {/* Back button */}
      <div className="px-2 pt-1 pb-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2.5 rounded-md px-1.5 py-1 text-[13.5px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/40 transition-all duration-200 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-1"
        >
          <ArrowLeft className="size-4 text-muted-foreground/50" />
          <span className="group-data-[collapsible=icon]:hidden">{backLabel}</span>
        </Link>
      </div>

      {/* Settings nav items */}
      <SidebarGroup className="px-0">
        <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-wider font-semibold text-sidebar-foreground/45">设置</SidebarGroupLabel>
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
                      "group relative transition-all duration-150 py-1.5 h-8.5 text-[13.5px] rounded select-none group-data-[collapsible=icon]:justify-center",
                      isActive
                        ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground/65 hover:bg-transparent! hover:text-sidebar-foreground/65!"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 transition-colors duration-150",
                        isActive
                          ? "text-sidebar-accent-foreground"
                          : "text-muted-foreground/45"
                      )}
                    />
                    <span className="tracking-wide group-data-[collapsible=icon]:hidden">{item.label}</span>
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
