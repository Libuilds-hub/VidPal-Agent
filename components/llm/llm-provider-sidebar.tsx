"use client"

import { Search } from "lucide-react"
import { getProviderIcon } from "./provider-icons"

export interface ProviderSidebarItem {
  name: string
  isConfigured: boolean
}

interface Props {
  providers: ProviderSidebarItem[]
  templates: string[]
  activeFilter: string | null
  onFilterChange: (name: string | null) => void
  onCustomClick: () => void
}

export default function LlmProviderSidebar({
  providers,
  templates,
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
          <input
            type="text"
            placeholder="搜索服务商..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {/* "全部" */}
        <button
          onClick={() => onFilterChange(null)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-1 ${
            activeFilter === null
              ? "bg-muted/70 text-foreground font-medium"
              : "text-foreground/70 hover:bg-muted/40"
          }`}
        >
          <span className="flex items-center justify-center w-4 h-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </span>
          全部
        </button>

        {/* 自定义 */}
        <button
          onClick={onCustomClick}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-1 text-foreground/70 hover:bg-muted/40"
        >
          <span className="flex items-center justify-center w-4 h-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </span>
          自定义
        </button>

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
                <span className="flex items-center justify-center w-4 h-4 shrink-0">
                  {getProviderIcon(p.name)}
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
                <span className="flex items-center justify-center w-4 h-4 shrink-0">
                  {getProviderIcon(name)}
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
