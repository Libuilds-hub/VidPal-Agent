import { SettingsPageHeader } from "@/components/settings/settings-page-header"

export default function HelpPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <SettingsPageHeader title="使用与帮助" description="查看键盘快捷键与常见故障处理方法" />
      <div className="max-w-2xl space-y-3 animate-in fade-in-50 duration-150">
        <a href="/help" className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-3 px-3 rounded-lg transition-colors cursor-pointer select-none">
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-foreground/85">常见使用问题</div>
            <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">全面了解如何快速导入视频、转写并获取深度知识结构</div>
          </div>
          <span className="text-muted-foreground/60 text-sm font-semibold">→</span>
        </a>
        <div className="h-px bg-border/20" />
        <div className="flex items-center justify-between py-2.5">
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-foreground/85">全局快捷键</div>
            <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">唤醒和操作界面元素的键盘命令</div>
          </div>
          <span className="text-muted-foreground/65 text-[11px] font-semibold bg-muted/60 px-1.5 py-0.5 rounded border border-border/30 font-mono">⌘K</span>
        </div>
        <div className="h-px bg-border/20" />
        <a href="mailto:support@example.com" className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-3 px-3 rounded-lg transition-colors cursor-pointer select-none">
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-foreground/85">在线反馈与建议</div>
            <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">提交故障报告或您想让我们开发的功能想法</div>
          </div>
          <span className="text-muted-foreground/60 text-sm font-semibold">→</span>
        </a>
      </div>
    </div>
  )
}
