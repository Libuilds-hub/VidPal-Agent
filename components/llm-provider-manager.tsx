"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, AlertCircle, Plus, X } from "lucide-react"
import LlmProviderCard, { AddTemplateCard } from "@/components/llm/llm-provider-card"
import LlmProviderSidebar from "@/components/llm/llm-provider-sidebar"
import LlmProviderDetail from "@/components/llm/llm-provider-detail"

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
      className={`flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-md animate-in fade-in slide-in-from-top-2 ${
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

export default function LlmProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<ProviderForm>(emptyForm)
  const [editKeys, setEditKeys] = useState<Record<string, string>>({})
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customForm, setCustomForm] = useState({ name: "", baseUrl: "", models: "", apiKey: "" })

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

  const handleCustomCreate = async () => {
    if (!customForm.name || !customForm.baseUrl) return
    setSaving("new")
    const res = await fetch("/api/llm-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...customForm,
        isDefault: providers.length === 0,
        enableThinking: true,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setShowCustomModal(false)
      setCustomForm({ name: "", baseUrl: "", models: "", apiKey: "" })
      setStatusMsg({ type: "success", text: `已添加 ${customForm.name}` })
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
    fetchProviders()
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    const updated = { ...testResult }
    delete updated[id]
    setTestResult(updated)
    try {
      const res = await fetch(`/api/llm-providers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setTestResult({
        ...updated,
        [id]: {
          ok: data.success,
          msg: data.success ? "连接成功" : (data.error || "连接失败"),
        },
      })
    } catch {
      setTestResult({
        ...updated,
        [id]: { ok: false, msg: "网络请求失败" },
      })
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

  const providerNames = new Set(providers.map((p) => p.name.toLowerCase()))
  const availableTemplates = Object.entries(BUILTIN_TEMPLATES).filter(
    ([, t]) => !providerNames.has(t.name.toLowerCase())
  )

  const filteredProviders = activeFilter
    ? providers.filter((p) => p.name.toLowerCase() === activeFilter.toLowerCase())
    : providers

  const sidebarItems = useMemo(() => {
    return [
      ...providers.map((p) => ({ name: p.name, isConfigured: true })),
      ...availableTemplates.map(([, t]) => ({ name: t.name, isConfigured: false })),
    ]
  }, [providers, availableTemplates])

  const templateNames = availableTemplates.map(([, t]) => t.name)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full animate-in fade-in-50 duration-150">
      <LlmProviderSidebar
        providers={sidebarItems}
        templates={templateNames}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onCustomClick={() => setShowCustomModal(true)}
      />

      {/* Render detail view when a configured provider is selected */}
      {activeFilter && filteredProviders.length === 1 ? (
        <LlmProviderDetail
          provider={filteredProviders[0]}
          testing={testing === filteredProviders[0].id}
          testResult={testResult[filteredProviders[0].id]}
          saving={saving === filteredProviders[0].id}
          editKey={editKeys[filteredProviders[0].id] ?? ""}
          onTest={(modelName) => handleTest(filteredProviders[0].id)}
          onUpdate={(field, value) => handleUpdate(filteredProviders[0].id, field, value)}
          onSaveKey={() => handleSaveKey(filteredProviders[0].id)}
          onEditKeyChange={(v) => setEditKeys((prev) => ({ ...prev, [filteredProviders[0].id]: v }))}
          onBack={() => setActiveFilter(null)}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-8">
          <StatusBanner type={statusMsg?.type ?? "success"} text={statusMsg?.text ?? ""} onDismiss={clearStatus} />

        {/* Empty state (no providers at all) */}
        {providers.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">尚未配置 AI 供应商，请从下方模板开始或自定义添加</p>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(BUILTIN_TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => handleAddTemplate(key)}
                className="px-4 py-2 text-[13px] font-medium rounded-lg border border-border/40 bg-card hover:bg-muted/70 transition-colors cursor-pointer"
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={() => { setForm(emptyForm); setShowAdd(true) }}
              className="px-4 py-2 text-[13px] font-medium rounded-lg border border-border/40 bg-card hover:bg-muted/70 transition-colors cursor-pointer"
            >
              自定义
            </button>
          </div>
        </div>
      )}

      {/* No results for active filter (template selected) */}
      {activeFilter && filteredProviders.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong>{activeFilter}</strong> 尚未配置
          </p>
          {(() => {
            const templateKey = Object.entries(BUILTIN_TEMPLATES).find(
              ([, t]) => t.name.toLowerCase() === activeFilter.toLowerCase()
            )
            if (templateKey) {
              return (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      handleAddTemplate(templateKey[0])
                      setActiveFilter(null)
                    }}
                    className="px-4 py-2 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    使用模板添加
                  </button>
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="px-4 py-2 text-[13px] font-medium rounded-lg border border-border/40 bg-card hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    查看全部
                  </button>
                </div>
              )
            }
            return (
              <button
                onClick={() => setActiveFilter(null)}
                className="text-[12px] text-primary hover:underline cursor-pointer"
              >
                查看全部
              </button>
            )
          })()}
        </div>
      )}

      {/* Configured providers section */}
      {filteredProviders.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <h2 className="text-[17px] font-semibold text-foreground/90">
              {activeFilter ? activeFilter : "已配置供应商"}
            </h2>
            {!activeFilter && (
              <span className="bg-muted/60 text-muted-foreground text-[12px] px-2 py-0.5 rounded-full font-medium">
                {providers.length}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredProviders.map((p) => (
              <LlmProviderCard
                key={p.id}
                provider={p}
                testing={testing === p.id}
                testResult={testResult[p.id]}
                saving={saving === p.id}
                editKey={editKeys[p.id] ?? ""}
                onTest={() => handleTest(p.id)}
                onDelete={() => handleDelete(p.id, p.name)}
                onUpdate={(field, value) => handleUpdate(p.id, field, value)}
                onSaveKey={() => handleSaveKey(p.id)}
                onEditKeyChange={(v) => setEditKeys((prev) => ({ ...prev, [p.id]: v }))}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available templates section (hidden when filtering) */}
      {!activeFilter && availableTemplates.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <h2 className="text-[17px] font-semibold text-foreground/90">可用模板</h2>
            <span className="bg-muted/60 text-muted-foreground text-[12px] px-2 py-0.5 rounded-full font-medium">
              {availableTemplates.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {availableTemplates.map(([key, t]) => (
              <AddTemplateCard key={key} name={t.name} onClick={() => handleAddTemplate(key)} />
            ))}
          </div>
        </section>
      )}

      {/* Add button (hidden when filtering) */}
      {!activeFilter && providers.length > 0 && !showAdd && (
        <button
          onClick={() => { setForm(emptyForm); setShowAdd(true) }}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border/40 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[12px]"
        >
          <Plus className="h-3.5 w-3.5" /> 添加供应商
        </button>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-foreground/85">添加 AI 供应商</span>
            <div className="flex gap-1.5">
              {Object.entries(BUILTIN_TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => handleAddTemplate(key)}
                  className="h-6 px-2.5 text-[11px] font-medium rounded border border-border/40 bg-card hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted-foreground w-14 shrink-0">名称</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 OpenAI" className="h-7 text-[13px] flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted-foreground w-14 shrink-0">API Key</label>
              <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." className="h-7 text-[13px] flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted-foreground w-14 shrink-0">Base URL</label>
              <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" className="h-7 text-[13px] flex-1 font-mono" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted-foreground w-14 shrink-0">模型</label>
              <Input value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} placeholder="gpt-4, gpt-3.5-turbo" className="h-7 text-[13px] flex-1" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-5">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-muted-foreground">设为默认</span>
                <ToggleSwitch checked={form.isDefault} onChange={() => setForm({ ...form, isDefault: !form.isDefault })} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-muted-foreground">开启思考</span>
                <ToggleSwitch checked={form.enableThinking} onChange={() => setForm({ ...form, enableThinking: !form.enableThinking })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdd(false); setForm(emptyForm) }}
                className="h-7 px-3 text-[12px] font-medium rounded-md border border-border/40 hover:bg-muted/60 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.baseUrl || saving === "new"}
                className="h-7 px-3.5 text-[12px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
              >
                {saving === "new" && <Loader2 className="h-3 w-3 animate-spin" />}
                添加
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Custom provider modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCustomModal(false)}>
          <div className="bg-card rounded-xl border border-border/40 p-6 w-[420px] shadow-xl animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground/90">自定义供应商</h2>
              <button onClick={() => setShowCustomModal(false)} className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">名称</label>
                <Input value={customForm.name} onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })} placeholder="供应商名称" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                <Input type="password" value={customForm.apiKey} onChange={(e) => setCustomForm({ ...customForm, apiKey: e.target.value })} placeholder="sk-..." className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Base URL</label>
                <Input value={customForm.baseUrl} onChange={(e) => setCustomForm({ ...customForm, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="h-9 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">模型 (逗号分隔)</label>
                <Input value={customForm.models} onChange={(e) => setCustomForm({ ...customForm, models: e.target.value })} placeholder="model-1, model-2" className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCustomModal(false)} className="h-8 px-4 text-[12px] rounded-md border border-border/40 hover:bg-muted/60 transition-colors cursor-pointer">
                取消
              </button>
              <button
                onClick={handleCustomCreate}
                disabled={!customForm.name || !customForm.baseUrl || saving === "new"}
                className="h-8 px-4 text-[12px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
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
