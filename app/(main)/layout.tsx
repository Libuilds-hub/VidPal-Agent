"use client"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 px-5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
          <SidebarTrigger className="size-8 rounded-lg hover:bg-muted/80 transition-colors [&>svg]:size-4" />
          <span className="text-xs font-medium text-muted-foreground/60 tracking-wide uppercase select-none">工作台</span>
        </header>
        <div className={cn(
          "flex flex-1 flex-col overflow-hidden",
        )}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
