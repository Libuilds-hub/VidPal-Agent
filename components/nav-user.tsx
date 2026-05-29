"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Settings } from "lucide-react"
import Link from "next/link"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="select-none cursor-pointer"
          asChild
        >
          <Link href="/settings/profile" className="flex items-center w-full">
            {/* Show avatar only when expanded */}
            <Avatar className="h-8 w-8 rounded-lg group-data-[collapsible=icon]:hidden">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg font-medium bg-muted/80 text-foreground/80">CN</AvatarFallback>
            </Avatar>

            {/* Show settings gear only when collapsed */}
            <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center size-8 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-muted-foreground/60 hover:text-foreground transition-all duration-150 shrink-0">
              <Settings className="size-4.5" />
            </div>

            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>

            {/* Expanded settings indicator on the far right */}
            <div className="ml-auto flex items-center justify-center size-7 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-muted-foreground/60 hover:text-foreground transition-all duration-150 group-data-[collapsible=icon]:hidden">
              <Settings className="size-4" />
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
