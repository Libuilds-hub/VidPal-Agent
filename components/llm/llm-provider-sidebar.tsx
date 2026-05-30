"use client"

import { useState } from "react"
import { Search, Plus } from "lucide-react"
import { getProviderAvatar } from "./provider-icons"

export interface SidebarProviderItem {
  name: string
  enabled: boolean
  isConfigured: boolean
  logo?: string | null
}

interface Props {
  enabledProviders: SidebarProviderItem[]
  disabledProviders: SidebarProviderItem[]
  unconfiguredProviders: SidebarProviderItem[]
  activeFilter: string | null
  onFilterChange: (name: string | null) => void
  onCustomClick: () => void
}

export default function LlmProviderSidebar({
  enabledProviders,
  disabledProviders,
  unconfiguredProviders,
  activeFilter,
  onFilterChange,
  onCustomClick,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("")

  const [enabledCollapsed, setEnabledCollapsed] = useState(false)
  const [disabledCollapsed, setDisabledCollapsed] = useState(false)
  const [unconfiguredCollapsed, setUnconfiguredCollapsed] = useState(false)

  const filteredEnabled = enabledProviders.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredDisabled = disabledProviders.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredUnconfigured = unconfiguredProviders.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
        {filteredEnabled.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setEnabledCollapsed(!enabledCollapsed)}
              className="w-full flex items-center px-2.5 pt-3 pb-1.5 text-left group cursor-pointer"
            >
              <span className="text-[12px] font-semibold text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors inline-flex items-center gap-1 font-sans">
                已启用
                <span className="text-[9px] text-muted-foreground/40 scale-75 transform origin-left">
                  {enabledCollapsed ? "▶" : "▼"}
                </span>
              </span>
            </button>
            {!enabledCollapsed && filteredEnabled.map((p) => (
              <button
                key={p.name}
                onClick={() => onFilterChange(p.name)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-0.5 ${
                  activeFilter === p.name
                    ? "bg-muted/70 text-foreground font-medium"
                    : "text-foreground/70 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center justify-center w-6 h-6 shrink-0">
                  {getProviderAvatar(p.name, 24, "square", p.logo)}
                </span>
                <span className="truncate flex-1 text-left">{p.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* 未启用 */}
        {filteredDisabled.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setDisabledCollapsed(!disabledCollapsed)}
              className="w-full flex items-center px-2.5 pt-3 pb-1.5 text-left group cursor-pointer"
            >
              <span className="text-[12px] font-semibold text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors inline-flex items-center gap-1 font-sans">
                未启用
                <span className="text-[9px] text-muted-foreground/40 scale-75 transform origin-left">
                  {disabledCollapsed ? "▶" : "▼"}
                </span>
              </span>
            </button>
            {!disabledCollapsed && filteredDisabled.map((p) => (
              <button
                key={p.name}
                onClick={() => onFilterChange(p.name)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-0.5 ${
                  activeFilter === p.name
                    ? "bg-muted/70 text-foreground font-medium"
                    : "text-foreground/70 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center justify-center w-6 h-6 shrink-0">
                  {getProviderAvatar(p.name, 24, "square", p.logo)}
                </span>
                <span className="truncate flex-1 text-left">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* 其他 */}
        {filteredUnconfigured.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setUnconfiguredCollapsed(!unconfiguredCollapsed)}
              className="w-full flex items-center px-2.5 pt-3 pb-1.5 text-left group cursor-pointer"
            >
              <span className="text-[12px] font-semibold text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors inline-flex items-center gap-1 font-sans">
                其他
                <span className="text-[9px] text-muted-foreground/40 scale-75 transform origin-left">
                  {unconfiguredCollapsed ? "▶" : "▼"}
                </span>
              </span>
            </button>
            {!unconfiguredCollapsed && filteredUnconfigured.map((p) => (
              <button
                key={p.name}
                onClick={() => onFilterChange(p.name)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-0.5 ${
                  activeFilter === p.name
                    ? "bg-muted/70 text-foreground font-medium"
                    : "text-foreground/70 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center justify-center w-6 h-6 shrink-0">
                  {getProviderAvatar(p.name, 24, "square", p.logo)}
                </span>
                <span className="truncate flex-1 text-left">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
