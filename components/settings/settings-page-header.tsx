export function SettingsPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="pb-4 border-b border-border/20 mb-6">
      <h1 className="text-[14px] font-semibold text-foreground/95">{title}</h1>
      <p className="text-[10.5px] text-muted-foreground/75 mt-0.5">{description}</p>
    </div>
  )
}
