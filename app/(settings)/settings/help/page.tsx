import { SettingsPageHeader } from "@/components/settings/settings-page-header"

export default function HelpPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <div className="max-w-2xl mx-auto w-full py-4 space-y-6 animate-in fade-in-50 duration-150">
        <SettingsPageHeader title="使用与帮助" description="查看键盘快捷键与常见故障处理方法" />
        
        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold text-muted-foreground/80 pl-1 uppercase tracking-wider select-none">帮助与反馈</h2>
          <div className="rounded-xl border border-border/40 bg-card/45 overflow-hidden shadow-xs divide-y divide-border/20">
            <a href="/help" className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer select-none">
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-foreground/85">常见使用问题</div>
                <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">全面了解如何快速导入视频、转写并获取深度知识结构</div>
              </div>
              <span className="text-muted-foreground/60 text-sm font-semibold">→</span>
            </a>
            
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-foreground/85">全局快捷键</div>
                <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">唤醒和操作界面元素的键盘命令</div>
              </div>
              <span className="text-muted-foreground/65 text-[11px] font-semibold bg-muted/60 px-1.5 py-0.5 rounded border border-border/30 font-mono select-none">⌘K</span>
            </div>
            
            <a href="mailto:support@example.com" className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer select-none">
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-foreground/85">在线反馈与建议</div>
                <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">提交故障报告或您想让我们开发的功能想法</div>
              </div>
              <span className="text-muted-foreground/60 text-sm font-semibold">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
