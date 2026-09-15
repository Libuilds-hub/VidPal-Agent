"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, AlertCircle, Play, Trash2, Star } from "lucide-react"
import { getProviderIcon, getProviderDescription } from "./provider-icons"

interface Provider {
  id: string
  name: string
  /** 脱敏后的 Key（服务端不再回传明文） */
  apiKey: string
  /** 是否已在服务端配置明文 Key */
  hasApiKey?: boolean
  baseUrl: string
  models: string
  isDefault: boolean
  enableThinking: boolean
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-primary" : "bg-muted-foreground/20"
      }`}
    >
      <span
        className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
          checked ? "translate-x-[14px]" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

interface Props {
  provider: Provider
  testing: boolean
  testResult?: { ok: boolean; msg: string }
  saving: boolean
  editKey: string
  onTest: () => void
  onDelete: () => void
  onUpdate: (field: string, value: string | boolean) => void
  onSaveKey: () => void
  onEditKeyChange: (v: string) => void
}

export default function LlmProviderCard({
  provider: p,
  testing,
  testResult,
  saving,
  editKey,
  onTest,
  onDelete,
  onUpdate,
  onSaveKey,
  onEditKeyChange,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-border/30 bg-card p-5 flex flex-col transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center mb-3">
        <div className="mr-3 flex items-center" style={{ width: 28, height: 28 }}>
          {getProviderIcon(p.name)}
        </div>
        <span className="text-[16px] font-semibold text-foreground/90">{p.name}</span>
        {p.isDefault && (
          <span className="inline-flex items-center h-5 px-2 text-[11px] rounded-full bg-primary/10 text-primary border border-primary/20 ml-2">
            <Star className="h-2.5 w-2.5 mr-0.5" />默认
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[13px] text-muted-foreground/75 leading-relaxed mb-4 line-clamp-2 flex-1">
        {getProviderDescription(p.name)}
      </p>

      {/* Models preview */}
      <p className="text-[12px] text-muted-foreground/50 mb-4 truncate">
        模型：{p.models || "—"}
      </p>

      {/* Footer */}
      <div className="border-t border-border/15 pt-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onTest() }}
            disabled={testing}
            className="h-6.5 px-2.5 text-[11px] font-medium rounded border border-border/30 hover:bg-muted/60 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
          >
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            测试
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className="h-6.5 px-2.5 text-[11px] font-medium rounded border border-border/30 hover:bg-muted/60 transition-colors cursor-pointer"
          >
            {expanded ? "收起" : "编辑"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/60">默认</span>
            <ToggleSwitch checked={p.isDefault} onChange={() => onUpdate("isDefault", !p.isDefault)} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 text-muted-foreground/30 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`mt-3 flex items-center gap-1.5 text-[11px] px-2 py-1 rounded ${
          testResult.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
        }`}>
          {testResult.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {testResult.msg}
        </div>
      )}

      {/* Expandable edit form */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/15 space-y-2.5">
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-muted-foreground w-14 shrink-0">名称</label>
            <Input
              defaultValue={p.name}
              onBlur={(e) => { if (e.target.value && e.target.value !== p.name) onUpdate("name", e.target.value) }}
              className="h-7 text-[13px] flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12px] text-muted-foreground w-14 shrink-0">API Key</label>
            <Input
              type="password"
              placeholder={(p.hasApiKey ?? Boolean(p.apiKey)) ? "已保存（输入新 Key 以更换）" : "API Key"}
              value={editKey}
              onChange={(e) => onEditKeyChange(e.target.value)}
              className="h-7 text-[13px] flex-1"
            />
            <button
              onClick={onSaveKey}
              disabled={!editKey || saving}
              className="h-7 px-2.5 text-[12px] font-medium rounded border border-border/40 hover:bg-muted/60 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "保存"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12px] text-muted-foreground w-14 shrink-0">Base URL</label>
            <Input
              defaultValue={p.baseUrl}
              onBlur={(e) => { if (e.target.value && e.target.value !== p.baseUrl) onUpdate("baseUrl", e.target.value) }}
              className="h-7 text-[13px] flex-1 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12px] text-muted-foreground w-14 shrink-0">模型</label>
            <Input
              defaultValue={p.models}
              onBlur={(e) => { if (e.target.value && e.target.value !== p.models) onUpdate("models", e.target.value) }}
              placeholder="输入模型，多个用英文逗号分隔，首位为默认激活模型"
              className="h-7 text-[13px] flex-1 font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/10">
            <span className="text-[12px] text-muted-foreground">开启深度思考过程（Think）</span>
            <ToggleSwitch checked={p.enableThinking} onChange={() => onUpdate("enableThinking", !p.enableThinking)} />
          </div>
        </div>
      )}
    </div>
  )
}

export function AddTemplateCard({
  name,
  onClick,
}: {
  name: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-dashed border-border/40 bg-card/40 p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/40 hover:border-border/60 transition-all text-center min-h-[200px]"
    >
      <div className="flex items-center justify-center" style={{ width: 28, height: 28 }}>
        {getProviderIcon(name)}
      </div>
      <span className="text-[14px] font-semibold text-foreground/70">{name}</span>
      <p className="text-[12px] text-muted-foreground/60 line-clamp-2">{getProviderDescription(name)}</p>
      <span className="text-[12px] text-muted-foreground/50 mt-1 inline-flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14"/></svg>
        添加
      </span>
    </div>
  )
}
