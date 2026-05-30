"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react"
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

const BUILTIN_TEMPLATES: Record<string, { name: string; baseUrl: string; models: string }> = {
  minimax: { name: "MiniMax", baseUrl: "https://api.minimaxi.com/v1", models: "MiniMax-M2.7" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com", models: "deepseek-v4-flash" },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: "deepseek/deepseek-v4-flash:free",
  },
}

const OTHER_PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Moonshot",
  "Zhipu",
  "Ollama",
  "Groq",
  "Together",
]

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

export default function LlmProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})
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

  const allKnownNames = new Set([
    ...providerNames,
    ...templateNames.map((n) => n.toLowerCase()),
  ])
  const othersList = OTHER_PROVIDERS.filter(
    (name) => !allKnownNames.has(name.toLowerCase())
  )

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
        others={othersList}
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
        <div className="flex-1 flex items-center justify-center bg-background/35">
          <StatusBanner type={statusMsg?.type ?? "success"} text={statusMsg?.text ?? ""} onDismiss={clearStatus} />
          <div className="text-center">
            <p className="text-sm text-muted-foreground/60">从左侧选择一个供应商查看详情</p>
          </div>
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
