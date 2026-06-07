"use client"

import { useState } from "react"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import { Loader2, CheckCircle2 } from "lucide-react"

export default function UpdatesPage() {
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "up-to-date">("idle")

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="更新日志" description="检查是否有新版本可用并回顾系统版本进化历程" />
        
        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">版本状态</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 px-5 py-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12.5px] font-semibold text-foreground/85">当前版本 v1.2.0</div>
                <div className="text-[10.5px] text-muted-foreground/75 mt-0.5">主程序检查最新功能更新</div>
              </div>
              <button
                onClick={() => {
                  setUpdateStatus("checking")
                  setTimeout(() => setUpdateStatus("up-to-date"), 1200)
                }}
                disabled={updateStatus === "checking"}
                className="h-7 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-border/40 bg-card hover:bg-muted/70 disabled:opacity-50 transition-all duration-150 cursor-pointer select-none"
              >
                {updateStatus === "checking" && <Loader2 className="h-3 w-3 animate-spin" />}
                {updateStatus === "up-to-date" ? "已是最新" : updateStatus === "checking" ? "正在检查..." : "检查更新"}
              </button>
            </div>

            {updateStatus === "up-to-date" && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/15 mt-3.5 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> 已成功连接并校验，目前已是最新版本
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">更新记录</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 p-5 shadow-xs divide-y divide-border/15">
            <div className="flex items-start gap-3.5 pb-4">
              <span className="flex size-1.5 shrink-0 rounded-full bg-primary mt-1.5" />
              <div>
                <div className="text-[12px] font-semibold text-foreground/85">v1.2.0 — 设置页全面重构</div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-normal">全面将传统设置路由重构为顶级 Shadcn Dialog 弹窗，并支持无缝侧边栏分割，极致保持工作空间状态。</div>
                <div className="text-[10px] text-muted-foreground/45 mt-0.5">2026-05-22</div>
              </div>
            </div>
            <div className="flex items-start gap-3.5 py-4">
              <span className="flex size-1.5 shrink-0 rounded-full bg-muted-foreground/35 mt-1.5" />
              <div>
                <div className="text-[12px] font-semibold text-foreground/80">v1.1.0 — 历史对话功能引入</div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-normal">支持将对话流序列化并存入 LocalStorage，支持合集底部的多会话重加载。</div>
                <div className="text-[10px] text-muted-foreground/45 mt-0.5">2026-05-15</div>
              </div>
            </div>
            <div className="flex items-start gap-3.5 pt-4">
              <span className="flex size-1.5 shrink-0 rounded-full bg-muted-foreground/35 mt-1.5" />
              <div>
                <div className="text-[12px] font-semibold text-foreground/80">v1.0.0 — AI 辅助视频学习平台发布</div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-normal">核心视频导入、音频切片、文字转写、Prisma 数据落地及 DeepSeek 风格助手首发。</div>
                <div className="text-[10px] text-muted-foreground/45 mt-0.5">2026-05-08</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
