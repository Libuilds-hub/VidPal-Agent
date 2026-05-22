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
}: {
  items: SettingsNavItem[]
  activeId: string
  backHref?: string
}) {
  return (
    <>
      {/* Back button */}
      <div className="px-2 pt-1">
        <Link
          href={backHref}
          className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-sidebar-accent/40 transition-all duration-200"
        >
          <ArrowLeft className="size-[15px]" />
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
