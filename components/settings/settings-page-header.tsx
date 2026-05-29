export function SettingsPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-lg font-semibold text-foreground/95">{title}</h1>
      <p className="text-sm text-muted-foreground/75 mt-1">{description}</p>
      <div className="h-px bg-border/40 mt-4" />
    </div>
  )
}
