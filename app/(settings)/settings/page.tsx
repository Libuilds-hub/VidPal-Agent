"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/settings/profile")
  }, [router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3 text-muted-foreground select-none">
        <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
        <span className="text-xs font-semibold tracking-wide animate-pulse">正在载入设置...</span>
      </div>
    </div>
  )
}
