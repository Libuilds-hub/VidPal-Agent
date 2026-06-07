export function SettingsPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 select-none">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground/95">{title}</h1>
      <p className="text-xs text-muted-foreground/75 mt-1.5">{description}</p>
    </div>
  )
}
