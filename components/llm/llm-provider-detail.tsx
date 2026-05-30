"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Search } from "lucide-react"
import { getProviderIcon } from "./provider-icons"

interface Provider {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  models: string
  isDefault: boolean
  enableThinking: boolean
}

function parseModels(models: string): string[] {
  return models.split(",").map((m) => m.trim()).filter(Boolean)
}

function joinModels(list: string[]): string {
  return list.join(", ")
}

interface Props {
  provider: Provider
  testing: boolean
  testResult?: { ok: boolean; msg: string }
  saving: boolean
  editKey: string
  onTest: (modelName?: string) => void
  onUpdate: (field: string, value: string | boolean) => void
  onSaveKey: () => void
  onEditKeyChange: (v: string) => void
  onBack: () => void
}

export default function LlmProviderDetail({
  provider: p,
  testing,
  testResult,
  saving,
  editKey,
  onTest,
  onUpdate,
  onSaveKey,
  onEditKeyChange,
  onBack,
}: Props) {
  const [showKey, setShowKey] = useState(false)
  const [testModel, setTestModel] = useState(parseModels(p.models)[0] || "")
  const [enabled, setEnabled] = useState(true)
  const modelList = parseModels(p.models)
  const [activeModelTab, setActiveModelTab] = useState<string>("全部")
  const modelCount = modelList.length

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[900px] mx-auto px-10 py-10 animate-in fade-in duration-300">
        {/* Detail header */}
        <div className="flex items-center gap-4 pb-5 mb-10 border-b border-border">
          <div className="w-10 h-10 flex items-center justify-center">{getProviderIcon(p.name)}</div>
          <h1 className="text-xl font-semibold text-foreground/95">{p.name}</h1>
          <div className="ml-auto flex items-center gap-2.5">
            <button
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                enabled ? "bg-foreground" : "bg-muted-foreground/25"
              }`}
            >
              <span
                className={`pointer-events-none block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  enabled ? "translate-x-[19px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Settings section */}
        <div className="space-y-0">
          <div className="mb-6">
            <span className="text-sm font-semibold">供应商设置</span>
          </div>
          {/* API Key */}
          <div className="flex justify-between items-start py-6 border-b border-dashed border-border gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm  mb-1">API Key</div>
              <p className="text-xs text-muted-foreground leading-relaxed">请填写你的 API Key</p>
            </div>
            <div className="flex-[0_1_400px] w-full flex justify-end">
              <div className="relative w-full">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder={p.apiKey || "API Key"}
                  value={editKey}
                  onChange={(e) => onEditKeyChange(e.target.value)}
                  className="h-9 text-sm pr-9 border-border/40 rounded-md focus:border-blue-500"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* API 代理地址 */}
          <div className="flex justify-between items-start py-6 border-b border-dashed border-border gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm  mb-1">API 代理地址</div>
              <p className="text-xs text-muted-foreground leading-relaxed">自定义请求地址，例如使用代理服务器时填写。留空则使用默认地址。</p>
            </div>
            <div className="flex-[0_1_400px] w-full flex justify-end">
              <div className="w-full">
                <Input
                  defaultValue={p.baseUrl}
                  onBlur={(e) => { if (e.target.value && e.target.value !== p.baseUrl) onUpdate("baseUrl", e.target.value) }}
                  placeholder="https://api.deepseek.com/v1"
                  className="h-9 text-sm border-border/40 rounded-md focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 连通性检查 */}
          <div className="flex justify-between items-start py-6 border-b border-dashed border-border gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm  mb-1">连通性检查</div>
              <p className="text-xs text-muted-foreground leading-relaxed">测试 Api Key 与代理地址是否正确填写</p>
            </div>
            <div className="flex-[0_1_400px] w-full flex justify-end">
              <div className="w-full flex gap-2">
                <select
                  value={testModel}
                  onChange={(e) => setTestModel(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-border/40 bg-background px-2.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                >
                  {modelList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button
                  onClick={() => onTest(testModel)}
                  disabled={testing}
                  className="px-4 h-9 border border-border/40 bg-background hover:bg-muted/60 rounded-md cursor-pointer text-sm transition-colors flex items-center justify-center min-w-[72px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "检查"}
                </button>
              </div>
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div className="flex justify-end py-2">
              <div className={`flex-[0_1_400px] flex items-center gap-1.5 text-xs px-3 py-2 rounded-md ${
                testResult.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
              }`}>
                {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {testResult.msg}
              </div>
            </div>
          )}

        </div>

        {/* Model section */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-sm font-semibold mr-2">模型列表</span>
              <span className="text-xs text-muted-foreground">共 {modelCount} 个模型可用</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5 border border-border/30">
                <Search className="h-3 w-3 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="搜索模型..."
                  className="bg-transparent text-xs outline-none w-[110px]"
                />
              </div>
            </div>
          </div>

          {/* Model tabs */}
          <div className="flex gap-5 border-b-2 border-border mb-4">
            <button
              onClick={() => setActiveModelTab("全部")}
              className={`pb-2.5 text-sm transition-colors cursor-pointer flex items-center gap-1 relative -mb-0.5 ${
                activeModelTab === "全部"
                  ? "text-foreground  border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              全部 ({modelCount})
            </button>
            <button
              onClick={() => setActiveModelTab("对话")}
              className={`pb-2.5 text-sm transition-colors cursor-pointer flex items-center gap-1 relative -mb-0.5 ${
                activeModelTab === "对话"
                  ? "text-foreground  border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              对话 ({modelCount})
            </button>
          </div>

          {/* Model list header */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <span>已启用</span>
            <div className="flex gap-2 cursor-pointer">
              <span>👁️</span>
              <span>↓↑</span>
            </div>
          </div>

          {/* Model items */}
          <div>
            {modelList.map((model, idx) => (
              <div
                key={model}
                className="flex items-center py-4 border-b border-muted/60 last:border-b-0"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mr-3 shrink-0"
                  style={{ backgroundColor: "#2f54eb", color: "white", fontSize: 12 }}
                >
                  {getProviderIcon(p.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm  mb-1">
                    {model}
                    <span className="text-[11px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/30 font-normal">
                      {model.toLowerCase().replace(/\s+/g, "-")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {idx === 0 ? "默认激活模型" : "备用模型"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded border border-border/30 flex items-center gap-1">
                    🔧 1M
                  </span>
                  {modelList.length > 1 && (
                    <button
                      onClick={() => {
                        const filtered = modelList.filter((m) => m !== model)
                        if (filtered.length > 0) onUpdate("models", joinModels(filtered))
                      }}
                      className="text-[11px] text-muted-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
