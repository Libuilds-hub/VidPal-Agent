export default function IntegrationsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <div className="max-w-2xl space-y-3.5 animate-in fade-in-50 duration-150">
        <p className="text-[11.5px] text-muted-foreground/80 mb-3 leading-normal">集成第三方云服务、协作应用和通知助手，打通您日常的工作流</p>
        <div className="rounded-lg border border-border/30 divide-y divide-border/20 overflow-hidden bg-card/10">
          {[
            { name: "飞书办公", desc: "同步总结报告及进行重要消息推送通知" },
            { name: "GitHub Repository", desc: "绑定仓库提交问题报告及保存分析生成的 Markdown 资料" },
            { name: "Slack", desc: "分析完成时推送团队频道卡片" },
          ].map(({ name, desc }) => (
            <div key={name} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-foreground/85">{name}</div>
                <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-normal">{desc}</div>
              </div>
              <button className="h-6 px-3 text-[11px] font-semibold rounded border border-border/40 text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground/95 transition-all duration-150 cursor-pointer select-none">开始连接</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
