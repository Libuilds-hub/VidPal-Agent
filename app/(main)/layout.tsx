"use client"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"


import { usePathname } from "next/navigation"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const getPageTitle = (path: string) => {
    if (path === "/dashboard") return "仪表盘"
    if (path.startsWith("/ai-assistant/new-chat")) return "新对话"
    if (path.startsWith("/ai-assistant/history")) return "历史对话"
    if (path.startsWith("/ai-assistant")) return "聊天对话"
    if (path.startsWith("/agent")) return "Agent 控制台"
    if (path.startsWith("/knowledge-graph")) return "知识图谱"
    if (path.startsWith("/videos")) return "视频库"
    if (path.startsWith("/collections")) return "合集"
    if (path.startsWith("/settings")) return "设置"
    return "工作空间"
  }

  const title = getPageTitle(pathname)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-11 shrink-0 items-center gap-3 px-4 border-b border-border/45 bg-background/40 backdrop-blur-md select-none z-10">
          <SidebarTrigger className="size-7 rounded hover:bg-muted/70 text-muted-foreground/80 hover:text-foreground transition-all duration-150 [&>svg]:size-3.5" />
          <div className="h-4 w-px bg-border/40" />
          <span className="text-[11px] font-medium text-muted-foreground/75 tracking-wider uppercase">{title}</span>
        </header>
        <div className={cn(
          "flex flex-1 flex-col overflow-hidden bg-background",
        )}>
          {children}
        </div>
      </SidebarInset>

    </SidebarProvider>
  )
}

