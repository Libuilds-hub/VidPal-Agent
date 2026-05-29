"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ChevronDown, CheckCircle2, AlertCircle } from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Dropdown                                                                  */
/* -------------------------------------------------------------------------- */

export function Dropdown({
  value,
  options,
  width,
  onChange,
}: {
  value: string
  options: readonly string[]
  width?: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center justify-between rounded-md border border-border/45 bg-card px-2.5 py-1 text-[12px] font-medium",
          "hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 cursor-pointer select-none"
        )}
        style={{ width: width || "140px" }}
      >
        <span>{value}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground/60 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-full min-w-[120px] rounded-lg border border-border/40 bg-popover py-1 shadow-md animate-in fade-in zoom-in-95 origin-top-right">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className={cn(
                "block w-full px-2.5 py-1.5 text-left text-[12px] hover:bg-muted/50 transition-colors cursor-pointer",
                opt === value ? "font-medium text-foreground bg-muted/30" : "text-muted-foreground"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Toggle                                                                    */
/* -------------------------------------------------------------------------- */

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        checked ? "bg-primary" : "bg-muted-foreground/20"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200",
          checked ? "translate-x-[14px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Setting Row                                                               */
/* -------------------------------------------------------------------------- */

export function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 py-3 border-b border-border/20 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-normal text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5 leading-normal">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Status Banner                                                             */
/* -------------------------------------------------------------------------- */

export function StatusBanner({ type, text, onDismiss }: { type: "success" | "error"; text: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!text) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [text, onDismiss])

  if (!text) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-md animate-in fade-in slide-in-from-top-2",
        type === "success"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
      )}
    >
      {type === "success" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      <span className="font-medium">{text}</span>
    </div>
  )
}
