"use client"

import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
  pathname,
}: {
  items: { title: string; url: string; icon: LucideIcon }[]
  pathname: string
}) {
  return (
    <SidebarGroup className="px-0">
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url))
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className={cn(
                  "group relative transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Link href={item.url} className="flex items-center gap-2.5!">
                  <item.icon className={cn(
                    "size-[18px] transition-all duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground/50 group-hover:text-muted-foreground/80"
                  )} />
                  <span>{item.title}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-300" />
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
