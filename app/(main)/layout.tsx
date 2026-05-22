"use client"

import { usePathname } from "next/navigation"
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
  const pathname = usePathname()
  const isSettings = pathname.startsWith("/settings")

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        {!isSettings && (
          <header className="flex h-11 shrink-0 items-center gap-3 px-4 border-b border-border/45 bg-background/40 backdrop-blur-md select-none z-10">
            <SidebarTrigger className="size-7 rounded hover:bg-muted/70 text-muted-foreground/80 hover:text-foreground transition-all duration-150 [&>svg]:size-3.5" />
            <div className="h-4 w-px bg-border/40" />
            <span className="text-[11px] font-medium text-muted-foreground/75 tracking-wider uppercase">工作台</span>
          </header>
        )}
        <div className={cn(
          "flex flex-1 flex-col overflow-hidden bg-background",
        )}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
