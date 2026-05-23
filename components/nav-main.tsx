"use client"

import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export function NavMain({
  groups,
  pathname,
}: {
  groups: NavGroup[]
  pathname: string
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <SidebarGroup key={group.label} className="px-0 py-0">
          <SidebarGroupLabel className="px-3 text-[11px] uppercase tracking-wider font-semibold text-sidebar-foreground/40 mb-1.5 transition-opacity duration-200">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.url || (
                  item.url !== "/dashboard" &&
                  item.url !== "/ai-assistant" &&
                  pathname.startsWith(item.url)
                )
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "group relative transition-all duration-150 py-1.5 h-8.5 text-[13.5px] rounded select-none",
                        isActive
                          ? "bg-sidebar-accent/70 text-foreground font-semibold"
                          : "text-muted-foreground/65 hover:bg-transparent! hover:text-muted-foreground/65!"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-2.5! pl-3 group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:justify-center">
                        <item.icon className={cn(
                          "size-4 transition-colors duration-150",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground/45"
                        )} />
                        <span className="tracking-wide group-data-[collapsible=icon]:hidden">{item.title}</span>
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
  )
}
