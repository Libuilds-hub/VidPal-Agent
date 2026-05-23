"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function SettingsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard?settings=true")
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground select-none">
        <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
        <span className="text-xs font-semibold tracking-wide animate-pulse">正在为您载入系统设置...</span>
      </div>
    </div>
  )
}
