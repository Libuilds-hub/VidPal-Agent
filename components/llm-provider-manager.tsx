"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Play,
  Star,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react"

interface Provider {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  models: string
  isDefault: boolean
  enableThinking: boolean
}

interface ProviderForm {
  name: string
  apiKey: string
  baseUrl: string
  models: string
  isDefault: boolean
  enableThinking: boolean
}

const emptyForm: ProviderForm = {
  name: "",
  apiKey: "",
  baseUrl: "",
  models: "",
  isDefault: false,
  enableThinking: true,
}

const BUILTIN_TEMPLATES: Record<string, { name: string; baseUrl: string; models: string }> = {
  minimax: { name: "MiniMax", baseUrl: "https://api.minimaxi.com/v1", models: "MiniMax-M2.7" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com", models: "deepseek-v4-flash" },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: "deepseek/deepseek-v4-flash:free",
  },
}

function parseModels(models: string): string[] {
  return models.split(",").map((m) => m.trim()).filter(Boolean)
}

function joinModels(list: string[]): string {
  return list.join(", ")
}

function StatusBanner({
  type,
  text,
  onDismiss,
}: {
  type: "success" | "error"
  text: string
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!text) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [text, onDismiss])

  if (!text) return null

  return (
    <div
      className={`flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-md animate-in fade-in slide-in-from-top-2 ${
        type === "success"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
      }`}
    >
      {type === "success" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      <span className="font-medium">{text}</span>
    </div>
  )
}

function ModelDropdown({
  models,
  onRemove,
  onAdd,
  onSelect,
  newModelValue,
  onNewModelChange,
}: {
  models: string[]
  onRemove: (model: string) => void
  onAdd: () => void
  onSelect: (model: string) => void
  newModelValue: string
  onNewModelChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-between w-full rounded-md border border-border/45 bg-card px-2.5 py-1 h-7 text-[12px] font-medium hover:bg-muted/60 transition-colors cursor-pointer select-none"
      >
        <span className="text-muted-foreground/75 truncate pr-1">{models[0]}</span>
        <ChevronDown
          className="h-3 w-3 text-muted-foreground/50 transition-transform duration-200 shrink-0 ml-auto"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-border/40 bg-popover py-1 shadow-md animate-in fade-in zoom-in-95 origin-top">
          {models.map((model, idx) => (
            <div
              key={model}
              onClick={() => { onSelect(model); setOpen(false) }}
              className={`flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer ${
                idx === 0 ? "bg-muted/20 font-medium" : ""
              }`}
            >
              <span className="text-[12px] text-foreground/85 truncate flex-1 min-w-0">{model}</span>
              {models.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(model) }}
                  className="shrink-0 ml-1.5 text-muted-foreground/40 hover:text-red-500 transition-colors cursor-pointer p-0.5 rounded hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <div className="border-t border-border/15 mt-1 pt-1 px-1.5 pb-0.5">
            <div className="flex items-center gap-1">
              <Input
                value={newModelValue}
                onChange={(e) => onNewModelChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { onAdd(); setOpen(false) } }}
                onClick={(e) => e.stopPropagation()}
                placeholder="自定义模型名称"
                className="h-6.5 text-[11px] flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent px-1"
              />
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(); setOpen(false) }}
                disabled={!newModelValue.trim()}
                className="h-6 w-6 flex items-center justify-center rounded border border-border/30 hover:bg-muted/60 disabled:opacity-30 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LlmProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<ProviderForm>(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editKeys, setEditKeys] = useState<Record<string, string>>({})
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [newModelInputs, setNewModelInputs] = useState<Record<string, string>>({})

  const fetchProviders = useCallback(async () => {
    const res = await fetch("/api/llm-providers")
    const data = await res.json()
    if (Array.isArray(data)) {
      setProviders(data)
      const keys: Record<string, string> = {}
      data.forEach((p: Provider) => { keys[p.id] = "" })
      setEditKeys(keys)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  useEffect(() => {
    if (loading) return
    if (providers.length === 0) {
      fetch("/api/llm-providers/migration", { method: "POST" }).then(() => fetchProviders())
    }
  }, [loading, providers.length, fetchProviders])

  const clearStatus = () => setStatusMsg(null)
  const clearTest = (id: string) => setTestResult((prev) => { const n = { ...prev }; delete n[id]; return n })

  const handleAddTemplate = (key: string) => {
    setForm({
      name: BUILTIN_TEMPLATES[key].name,
      apiKey: "",
      baseUrl: BUILTIN_TEMPLATES[key].baseUrl,
      models: BUILTIN_TEMPLATES[key].models,
      isDefault: providers.length === 0,
      enableThinking: true,
    })
    setShowAdd(true)
  }

  const handleCreate = async () => {
    if (!form.name || !form.baseUrl) return
    setSaving("new")
    const res = await fetch("/api/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setShowAdd(false)
      setForm(emptyForm)
      setStatusMsg({ type: "success", text: `已添加 ${form.name}` })
      fetchProviders()
    } else {
      setStatusMsg({ type: "error", text: data.error || "添加失败" })
    }
    setSaving(null)
  }

  const handleUpdate = async (id: string, field: string, value: string | boolean) => {
    const body: Record<string, string | boolean> = { [field]: value }
    if (field === "isDefault" && value === true) {
      body.isDefault = true
    }
    await fetch(`/api/llm-providers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    fetchProviders()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除供应商"${name}"吗？`)) return
    await fetch(`/api/llm-providers/${id}`, { method: "DELETE" })
    setStatusMsg({ type: "success", text: `已删除 ${name}` })
    if (expandedId === id) setExpandedId(null)
    fetchProviders()
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    clearTest(id)
    try {
      const res = await fetch(`/api/llm-providers/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      const data = await res.json()
      setTestResult({
        [id]: {
          ok: data.success,
          msg: data.success ? "连接成功" : (data.error || "连接失败"),
        },
      })
    } catch {
      setTestResult({ [id]: { ok: false, msg: "网络请求失败" } })
    }
    setTesting(null)
  }

  const handleSaveKey = async (id: string) => {
    const key = editKeys[id]
    if (!key) return
    setSaving(id)
    await handleUpdate(id, "apiKey", key)
    setEditKeys((prev) => ({ ...prev, [id]: "" }))
    setSaving(null)
    setStatusMsg({ type: "success", text: "API Key 已更新" })
  }

  const handleAddModel = async (id: string, currentModels: string) => {
    const newModel = (newModelInputs[id] || "").trim()
    if (!newModel) return
    const list = parseModels(currentModels)
    if (list.includes(newModel)) {
      setStatusMsg({ type: "error", text: `模型 "${newModel}" 已存在` })
      return
    }
    const newList = [newModel, ...list]
    await handleUpdate(id, "models", joinModels(newList))
    setNewModelInputs((prev) => ({ ...prev, [id]: "" }))
    setStatusMsg({ type: "success", text: `已添加并激活模型 ${newModel}` })
  }

  const handleSelectModel = async (id: string, currentModels: string, selectedModel: string) => {
    const list = parseModels(currentModels)
    const filtered = list.filter((m) => m !== selectedModel)
    const newList = [selectedModel, ...filtered]
    await handleUpdate(id, "models", joinModels(newList))
    setStatusMsg({ type: "success", text: `已激活模型 ${selectedModel}` })
  }

  const handleRemoveModel = async (id: string, currentModels: string, modelToRemove: string) => {
    const list = parseModels(currentModels).filter((m) => m !== modelToRemove)
    if (list.length === 0) {
      setStatusMsg({ type: "error", text: "至少保留一个模型" })
      return
    }
    await handleUpdate(id, "models", joinModels(list))
    setStatusMsg({ type: "success", text: `已移除模型 ${modelToRemove}` })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-in fade-in-50 duration-150">
      <StatusBanner type={statusMsg?.type ?? "success"} text={statusMsg?.text ?? ""} onDismiss={clearStatus} />

      {providers.length === 0 && !showAdd && (
        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">尚未配置 AI 供应商，请添加一个</p>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(BUILTIN_TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => handleAddTemplate(key)}
                className="px-3 py-1.5 text-[12px] font-medium rounded-md border border-border/40 bg-card hover:bg-muted/70 transition-colors cursor-pointer"
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={() => { setForm(emptyForm); setShowAdd(true) }}
              className="px-3 py-1.5 text-[12px] font-medium rounded-md border border-border/40 bg-card hover:bg-muted/70 transition-colors cursor-pointer"
            >
              自定义
            </button>
          </div>
        </div>
      )}

      {providers.map((p) => {
        const isExpanded = expandedId === p.id
        const testInfo = testResult[p.id]
        const modelList = parseModels(p.models)
        return (
          <div
            key={p.id}
            className="rounded-lg border border-border/30 bg-card/30 overflow-hidden"
          >
            {/* Header row */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className="p-0.5 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[13px] font-semibold text-foreground/85">{p.name}</span>
              {p.isDefault && (
                <span className="inline-flex items-center h-4 px-1.5 text-[10px] rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Star className="h-2.5 w-2.5 mr-0.5" />默认
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/50 ml-auto truncate max-w-[160px]">{p.models}</span>
              <button
                onClick={() => handleTest(p.id)}
                disabled={testing === p.id}
                className="h-6 px-2 text-[10px] font-medium rounded border border-border/30 hover:bg-muted/60 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                测试
              </button>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="p-1 text-muted-foreground/40 hover:text-red-500 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {testInfo && (
              <div className={`mx-3 mb-2 flex items-center gap-1.5 text-[10px] px-2 py-1 rounded ${
                testInfo.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
              }`}>
                {testInfo.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {testInfo.msg}
              </div>
            )}

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-border/15 pt-2.5">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground w-14 shrink-0">名称</label>
                  <Input
                    defaultValue={p.name}
                    onBlur={(e) => { if (e.target.value && e.target.value !== p.name) handleUpdate(p.id, "name", e.target.value) }}
                    className="h-7 text-[12px] flex-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground w-14 shrink-0">API Key</label>
                  <Input
                    type="password"
                    placeholder={p.apiKey}
                    value={editKeys[p.id] ?? ""}
                    onChange={(e) => setEditKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="h-7 text-[12px] flex-1"
                  />
                  <button
                    onClick={() => handleSaveKey(p.id)}
                    disabled={!editKeys[p.id] || saving === p.id}
                    className="h-7 px-2.5 text-[11px] font-medium rounded border border-border/40 hover:bg-muted/60 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                  >
                    {saving === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "保存"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground w-14 shrink-0">Base URL</label>
                  <Input
                    defaultValue={p.baseUrl}
                    onBlur={(e) => { if (e.target.value && e.target.value !== p.baseUrl) handleUpdate(p.id, "baseUrl", e.target.value) }}
                    className="h-7 text-[12px] flex-1 font-mono"
                  />
                </div>

                {/* Models — fully editable text input */}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground w-14 shrink-0">模型</label>
                  <Input
                    defaultValue={p.models}
                    onBlur={(e) => { if (e.target.value && e.target.value !== p.models) handleUpdate(p.id, "models", e.target.value) }}
                    placeholder="输入模型，多个用英文逗号分隔，首位为默认激活模型"
                    className="h-7 text-[12px] flex-1 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/10">
                  <span className="text-[11px] text-muted-foreground">设为默认供应商</span>
                  <button
                    role="switch"
                    aria-checked={p.isDefault}
                    onClick={() => handleUpdate(p.id, "isDefault", !p.isDefault)}
                    className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      p.isDefault ? "bg-primary" : "bg-muted-foreground/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                        p.isDefault ? "translate-x-[14px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-border/10">
                  <span className="text-[11px] text-muted-foreground">开启深度思考过程（Think）</span>
                  <button
                    role="switch"
                    aria-checked={p.enableThinking}
                    onClick={() => handleUpdate(p.id, "enableThinking", !p.enableThinking)}
                    className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      p.enableThinking ? "bg-primary" : "bg-muted-foreground/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                        p.enableThinking ? "translate-x-[14px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {providers.length > 0 && !showAdd && (
        <button
          onClick={() => { setForm(emptyForm); setShowAdd(true) }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/40 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[12px]"
        >
          <Plus className="h-3.5 w-3.5" /> 添加供应商
        </button>
      )}

      {showAdd && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground/85">添加 AI 供应商</span>
            <div className="flex gap-1.5">
              {Object.entries(BUILTIN_TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => handleAddTemplate(key)}
                  className="h-6 px-2 text-[10px] font-medium rounded border border-border/40 bg-card hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground w-14 shrink-0">名称</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 OpenAI" className="h-7 text-[12px] flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground w-14 shrink-0">API Key</label>
            <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." className="h-7 text-[12px] flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground w-14 shrink-0">Base URL</label>
            <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" className="h-7 text-[12px] flex-1 font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground w-14 shrink-0">模型</label>
            <Input value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} placeholder="gpt-4, gpt-3.5-turbo" className="h-7 text-[12px] flex-1" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">设为默认</span>
                <button
                  role="switch"
                  aria-checked={form.isDefault}
                  onClick={() => setForm({ ...form, isDefault: !form.isDefault })}
                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                    form.isDefault ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                >
                  <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                    form.isDefault ? "translate-x-[14px]" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">开启思考</span>
                <button
                  role="switch"
                  aria-checked={form.enableThinking}
                  onClick={() => setForm({ ...form, enableThinking: !form.enableThinking })}
                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                    form.enableThinking ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                >
                  <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                    form.enableThinking ? "translate-x-[14px]" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdd(false); setForm(emptyForm) }}
                className="h-7 px-3 text-[11px] font-medium rounded-md border border-border/40 hover:bg-muted/60 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.baseUrl || saving === "new"}
                className="h-7 px-3.5 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
              >
                {saving === "new" && <Loader2 className="h-3 w-3 animate-spin" />}
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
