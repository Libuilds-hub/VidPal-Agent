"use client"

import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavSecondary({
  items,
  pathname,
  ...props
}: {
  items: { title: string; url: string; icon: LucideIcon }[]
  pathname: string
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props} className={cn("px-0", props.className)}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.url)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent/80 font-medium"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40"
                  )}
                >
                  <Link href={item.url} className="flex items-center gap-2.5!">
                    <item.icon className={cn(
                      "size-[15px] transition-colors duration-200",
                      isActive ? "text-primary/80" : "text-muted-foreground/40"
                    )} />
                    <span className="text-[13px]">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
