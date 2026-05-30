"use client"

import { Search, Plus } from "lucide-react"
import { getProviderAvatar } from "./provider-icons"

export interface ProviderSidebarItem {
  name: string
  isConfigured: boolean
}

interface Props {
  providers: ProviderSidebarItem[]
  templates: string[]
  others: string[]
  activeFilter: string | null
  onFilterChange: (name: string | null) => void
  onCustomClick: () => void
}

export default function LlmProviderSidebar({
  providers,
  templates,
  others,
  activeFilter,
  onFilterChange,
  onCustomClick,
}: Props) {
  const configured = providers.filter((p) => p.isConfigured)

  return (
    <aside className="w-[240px] shrink-0 border-r border-border/30 bg-card/40 flex flex-col">
      {/* Search box */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="搜索服务商..."
              className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none pr-5"
            />
            <button
              onClick={onCustomClick}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hide">
        {/* 已启用 */}
        {configured.length > 0 && (
          <>
            <div className="flex items-center px-2.5 pt-3 pb-1.5">
              <span className="text-[12px] font-medium text-muted-foreground/70">
                已启用
              </span>
            </div>
            {configured.map((p) => (
              <button
                key={p.name}
                onClick={() => onFilterChange(p.name)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-0.5 ${
                  activeFilter === p.name
                    ? "bg-muted/70 text-foreground font-medium"
                    : "text-foreground/70 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 shrink-0">
                  {getProviderAvatar(p.name, 20)}
                </span>
                <span className="truncate flex-1 text-left">{p.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              </button>
            ))}
          </>
        )}

        {/* 未启用 / 可用模板 */}
        {templates.length > 0 && (
          <>
            <div className="flex items-center px-2.5 pt-3 pb-1.5">
              <span className="text-[12px] font-medium text-muted-foreground/70">
                未启用
              </span>
            </div>
            {templates.map((name) => (
              <button
                key={name}
                onClick={() => onFilterChange(name)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-0.5 ${
                  activeFilter === name
                    ? "bg-muted/70 text-foreground font-medium"
                    : "text-foreground/70 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 shrink-0">
                  {getProviderAvatar(name, 20)}
                </span>
                <span className="truncate flex-1 text-left">{name}</span>
              </button>
            ))}
          </>
        )}

        {/* 其他 */}
        {others.length > 0 && (
          <>
            <div className="flex items-center px-2.5 pt-3 pb-1.5">
              <span className="text-[12px] font-medium text-muted-foreground/70">
                其他
              </span>
            </div>
            {others.map((name) => (
              <button
                key={name}
                onClick={() => onFilterChange(name)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-0.5 ${
                  activeFilter === name
                    ? "bg-muted/70 text-foreground font-medium"
                    : "text-foreground/70 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 shrink-0">
                  {getProviderAvatar(name, 20)}
                </span>
                <span className="truncate flex-1 text-left">{name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
