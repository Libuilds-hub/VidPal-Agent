"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Search, Wrench, Video, Image, Plus, RotateCcw, Trash2, Pencil, X, Brain, RefreshCw } from "lucide-react"
import { getProviderIcon, getProviderHeader, getProviderAvatar } from "./provider-icons"

interface Provider {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  models: string
  isDefault: boolean
  enableThinking: boolean
  enabled: boolean
  logo?: string | null
}

const DEFAULT_URLS: Record<string, string> = {
  MiniMax: "https://api.minimaxi.com/v1",
  DeepSeek: "https://api.deepseek.com",
  OpenRouter: "https://openrouter.ai/api/v1",
  OpenAI: "https://api.openai.com/v1",
  Anthropic: "https://api.anthropic.com/v1",
  Google: "https://generativelanguage.googleapis.com/v1beta/openai",
  Moonshot: "https://api.moonshot.cn/v1",
  Zhipu: "https://open.bigmodel.cn/api/paas/v4",
  Ollama: "http://localhost:11434/v1",
  Qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  SiliconFlow: "https://api.siliconflow.cn/v1",
  LMStudio: "http://localhost:1234/v1",
  Stepfun: "https://api.stepfun.com/v1",
  Mistral: "https://api.mistral.ai/v1",
  "X.AI": "https://api.x.ai/v1",
  Doubao: "https://ark.cn-beijing.volces.com/api/v3",
}

function parseModels(models: string): string[] {
  return models.split(",").map((m) => m.trim()).filter(Boolean)
}

function joinModels(list: string[]): string {
  return list.join(", ")
}

const allModelTypes = [
  { icon: Wrench, label: "文本" },
  { icon: Image, label: "图片" },
  { icon: Video, label: "视频" },
  { icon: Search, label: "向量化" },
  { icon: Wrench, label: "ASR" },
  { icon: Wrench, label: "TTS" },
]

interface Props {
  provider: Provider
  testing: boolean
  testResult?: { ok: boolean; msg: string }
  saving: boolean
  editKey: string
  onSync?: () => Promise<any>
  onTest: (modelName?: string) => Promise<boolean>
  onUpdate: (field: string, value: string | boolean) => void
  onSaveKey: () => void
  onEditKeyChange: (v: string) => void
  onDelete: () => void
  onBack: () => void
}

export default function LlmProviderDetail({
  provider: p,
  testing,
  testResult,
  saving,
  editKey,
  onSync,
  onTest,
  onUpdate,
  onSaveKey,
  onEditKeyChange,
  onDelete,
  onBack,
}: Props) {
  const [showKey, setShowKey] = useState(false)
  const [testModel, setTestModel] = useState(parseModels(p.models)[0] || "")
  const [enabled, setEnabled] = useState(p.enabled !== false)
  const [localKey, setLocalKey] = useState(p.apiKey || "")
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setEnabled(p.enabled !== false)
  }, [p.enabled])

  useEffect(() => {
    setLocalKey(p.apiKey || "")
  }, [p.apiKey])
  const [enabledModels, setEnabledModels] = useState<Record<string, boolean>>({})
  
  const [localTestStatus, setLocalTestStatus] = useState<"idle" | "testing" | "success" | "fail">("idle")

  useEffect(() => {
    if (testing) {
      setLocalTestStatus("testing")
    } else if (testResult) {
      if (testResult.ok) {
        setLocalTestStatus("success")
        const timer = setTimeout(() => {
          setLocalTestStatus("idle")
        }, 2000)
        return () => clearTimeout(timer)
      } else {
        setLocalTestStatus("fail")
        const timer = setTimeout(() => {
          setLocalTestStatus("idle")
        }, 2000)
        return () => clearTimeout(timer)
      }
    } else {
      setLocalTestStatus("idle")
    }
  }, [testing, testResult])
  
  // Custom model modal states
  const [showModelModal, setShowModelModal] = useState(false)
  const [editingModel, setEditingModel] = useState<string | null>(null)
  const [deleteConfirmModel, setDeleteConfirmModel] = useState<string | null>(null)
  const [modelForm, setModelForm] = useState({
    id: "",
    name: "",
    type: "文本",
    context: "128000",
    thinking: false,
    vision: false,
    video: false,
    tools: false,
  })

  const modelList = parseModels(p.models)

  // Fetch meta for custom model
  const getModelMeta = (model: string) => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`llm_model_meta_${p.id}_${model}`)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // ignore
        }
      }
    }
    
    // Fallback default meta
    const mLower = model.toLowerCase()
    
    // Determine primary model type based on keywords
    let defaultType = "文本"
    if (mLower.includes("embed") || mLower.includes("vector")) {
      defaultType = "向量化"
    } else if (mLower.includes("image") || mLower.includes("dall") || mLower.includes("flux") || mLower.includes("recraft") || mLower.includes("sd-") || mLower.includes("cogview")) {
      defaultType = "图片"
    } else if (mLower.includes("video") || mLower.includes("sora") || mLower.includes("kling") || mLower.includes("vidu") || mLower.includes("cogvideo")) {
      defaultType = "视频"
    } else if (mLower.includes("whisper") || mLower.includes("asr")) {
      defaultType = "ASR"
    } else if (mLower.includes("tts") || mLower.includes("audio")) {
      defaultType = "TTS"
    }

    const isThinking = mLower.includes("reasoner") || mLower.includes("thinking") || mLower.includes("r1") || mLower.includes("o1") || mLower.includes("o3")
    const isVision = mLower.includes("vision") || mLower.includes("vl") || mLower.includes("multimodal") || mLower.includes("omni") || mLower.includes("gpt-4o") || mLower.includes("gpt-5") || mLower.includes("gemini") || mLower.includes("claude-3.5") || mLower.includes("claude-sonnet") || mLower.includes("claude-opus")
    const isVideo = mLower.includes("video") || mLower.includes("sora") || mLower.includes("kling") || mLower.includes("vidu")
    const isTools = mLower.includes("gpt-4") || mLower.includes("gpt-5") || mLower.includes("claude") || mLower.includes("gemini") || mLower.includes("fc") || mLower.includes("tool") || mLower.includes("qwen") || mLower.includes("deepseek") || mLower.includes("glm")
    
    return {
      id: model,
      name: model,
      type: defaultType,
      context: mLower.includes("gemini-3.5") || mLower.includes("gemini-3.1") ? "2097152" : (mLower.includes("grok-4") ? "1000000" : (mLower.includes("pro-seed-2") || mLower.includes("step-3") ? "256000" : "128000")),
      thinking: isThinking,
      vision: isVision,
      video: isVideo,
      tools: isTools,
    }
  }

  // Format context number (e.g. 128000 -> 128K, 1000000 -> 1M)
  const formatContext = (contextVal: string | number) => {
    const contextStr = String(contextVal).trim()
    const num = parseInt(contextStr)
    if (isNaN(num)) return contextStr
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  const handleModelSubmit = () => {
    if (!modelForm.id || !modelForm.id.trim()) {
      alert("模型 ID 必须填写！")
      return
    }
    if (!modelForm.name || !modelForm.name.trim()) {
      alert("模型名称 必须填写！")
      return
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(
        `llm_model_meta_${p.id}_${modelForm.id}`,
        JSON.stringify(modelForm)
      )
    }

    if (editingModel) {
      if (editingModel !== modelForm.id) {
        // ID changed (if allowed in future, currently disabled in form)
        const updated = modelList.map((m) => m === editingModel ? modelForm.id : m)
        if (typeof window !== "undefined") {
          localStorage.removeItem(`llm_model_meta_${p.id}_${editingModel}`)
        }
        onUpdate("models", joinModels(updated))
      } else {
        // ID remains same, just update metadata (triggers list re-render)
        onUpdate("models", joinModels([...modelList])) 
      }
    } else {
      // Adding new model
      onUpdate("models", joinModels([modelForm.id, ...modelList]))
    }

    setShowModelModal(false)
  }

  const modelTypes = modelList.map((m) => {
    const meta = getModelMeta(m)
    const typeLabel = meta.type
    const foundType = allModelTypes.find((t) => t.label === typeLabel) || { icon: Wrench, label: "文本" }
    return foundType
  })

  const presentTypes = [...new Set(modelTypes.map((t) => t.label))]
  const [activeModelTab, setActiveModelTab] = useState<string>("全部")
  const modelCount = modelList.length

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[900px] mx-auto px-8 py-6 animate-in fade-in duration-300">
        {/* Detail header */}
        <div className="flex items-center gap-4 pb-3 mb-5 border-b border-border">
          {getProviderHeader(p.name, 36, p.logo)}
          <div className="ml-auto flex items-center gap-2.5">
            {p.id.startsWith("template-") || editKey.trim() !== "" ? (
              <button
                onClick={async () => {
                  if (saving || testing) return
                  const pass = await onTest(testModel)
                  if (pass) {
                    onSaveKey()
                  }
                }}
                disabled={!editKey.trim() || saving || testing}
                className="h-8 px-4 text-[12px] font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                保存
              </button>
            ) : (
              <>
                <button
                  onClick={onDelete}
                  className="p-1.5 text-muted-foreground/30 hover:text-red-500 transition-colors cursor-pointer"
                  title="删除供应商"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => {
                    const nextVal = !enabled
                    setEnabled(nextVal)
                    onUpdate("enabled", nextVal)
                  }}
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
              </>
            )}
          </div>
        </div>

        {/* Settings section */}
        <div className="space-y-0 mb-5">
          <div className="pb-1.5 mb-2.5 border-b border-border/20">
            <span className="text-sm font-semibold text-foreground/80">供应商设置</span>
          </div>
          {/* API Key */}
          <div className="flex justify-between items-start py-3.5 border-b border-dashed border-border gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm  mb-1">API Key</div>
              <p className="text-xs text-muted-foreground leading-relaxed">请填写你的 API Key</p>
            </div>
            <div className="flex-[0_1_400px] w-full flex justify-end">
              <div className="relative w-full">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="API Key"
                  value={localKey}
                  onChange={(e) => {
                    setLocalKey(e.target.value)
                    onEditKeyChange(e.target.value)
                  }}
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

          {/* 请求地址 */}
          <div className="flex justify-between items-start py-3.5 border-b border-dashed border-border gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm  mb-1">请求地址</div>
              <p className="text-xs text-muted-foreground leading-relaxed">自定义请求地址，留空则使用默认地址。</p>
            </div>
            <div className="flex-[0_1_400px] w-full flex justify-end">
              <div className="w-full">
                <Input
                  defaultValue={p.baseUrl}
                  onBlur={(e) => { if (e.target.value && e.target.value !== p.baseUrl) onUpdate("baseUrl", e.target.value) }}
                  placeholder={DEFAULT_URLS[p.name] || "https://api.example.com/v1"}
                  className="h-9 text-sm border-border/40 rounded-md focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 连通性检查 */}
          <div className="flex justify-between items-start py-3.5 border-b border-dashed border-border gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm  mb-1">连通性检查</div>
              <p className="text-xs text-muted-foreground leading-relaxed">测试 Api Key 与请求地址是否正确填写</p>
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
                  disabled={localTestStatus === "testing" || localTestStatus === "success" || localTestStatus === "fail"}
                  className={`px-4 h-9 rounded-md text-sm transition-colors flex items-center justify-center min-w-[80px] disabled:cursor-not-allowed border ${
                    localTestStatus === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : localTestStatus === "fail"
                      ? "border-red-500/30 bg-red-500/10 text-red-500 font-medium"
                      : "border-border/40 bg-background hover:bg-muted/60 text-foreground cursor-pointer disabled:opacity-50"
                  }`}
                >
                  {localTestStatus === "testing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {localTestStatus === "success" && "成功"}
                  {localTestStatus === "fail" && "请重试"}
                  {localTestStatus === "idle" && "检查"}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Model section */}
        <div className="mt-6 pt-4 border-t border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-semibold mr-2">模型列表</span>
              <span className="text-xs text-muted-foreground">共 {modelCount} 个模型可用</span>
            </div>
            <div className="flex items-center gap-2">
              {onSync && (
                <button
                  onClick={async () => {
                    if (syncing) return
                    setSyncing(true)
                    try {
                      await onSync()
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setSyncing(false)
                    }
                  }}
                  disabled={syncing || !p.apiKey}
                  className="h-[30px] px-3 gap-1.5 border border-border/40 bg-background hover:bg-muted/60 disabled:opacity-50 rounded-md cursor-pointer flex items-center justify-center transition-all text-xs font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98] text-foreground"
                  title="从云端 API 获取最新模型列表并自动填充属性"
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  同步云端模型
                </button>
              )}
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5 border border-border/30">
                <Search className="h-3 w-3 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="搜索模型..."
                  className="bg-transparent text-xs outline-none w-[110px]"
                />
              </div>
              <button
                onClick={() => {
                  setEditingModel(null)
                  setModelForm({
                    id: "",
                    name: "",
                    type: "文本",
                    context: "128000",
                    thinking: false,
                    vision: false,
                    video: false,
                    tools: false,
                  })
                  setShowModelModal(true)
                }}
                className="w-[30px] h-[30px] border border-border/40 bg-background hover:bg-muted/60 rounded-md cursor-pointer flex items-center justify-center transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                className="w-[30px] h-[30px] border border-border/40 bg-background hover:bg-muted/60 rounded-md cursor-pointer flex items-center justify-center transition-colors"
                title="重置模型列表"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Model tabs */}
          <div className="flex gap-5 border-b-2 border-border mb-3">
            <button
              onClick={() => setActiveModelTab("全部")}
              className={`pb-2 text-sm transition-colors cursor-pointer flex items-center gap-1 relative -mb-0.5 ${
                activeModelTab === "全部"
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              全部 ({modelCount})
            </button>
            {presentTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveModelTab(type)}
                className={`pb-2 text-sm transition-colors cursor-pointer flex items-center gap-1 relative -mb-0.5 ${
                  activeModelTab === type
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type} ({modelTypes.filter((t) => t.label === type).length})
              </button>
            ))}
          </div>

          {/* Model items */}
          {(() => {
            const filtered = modelList.filter(
              (_, i) => activeModelTab === "全部" || modelTypes[i].label === activeModelTab
            )
            const enabledList = filtered.filter((m) => enabledModels[m] !== false)
            const disabledList = filtered.filter((m) => enabledModels[m] === false)

            const renderRow = (model: string) => {
              const meta = getModelMeta(model)
              
              let TagIcon = Wrench
              const typeLabel = meta.type
              const foundType = allModelTypes.find((t) => t.label === typeLabel)
              if (foundType) TagIcon = foundType.icon

              return (
                <div
                  key={model}
                  className="flex items-center py-2.5 border-b border-muted/60 last:border-b-0"
                >
                  <div className="mr-3 shrink-0">
                    {getProviderAvatar(p.name, 28, "circle", p.logo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground/90 mb-0.5">
                      {meta.name}
                      <span className="text-[11px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/30 font-normal font-mono">
                        {meta.id}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground/70">
                      {meta.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Capability Tags */}
                    {meta.thinking && (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-1.5 rounded border border-emerald-500/20 flex items-center justify-center shrink-0" title="深度思考">
                        <Brain className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {meta.tools && (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-1.5 rounded border border-amber-500/20 flex items-center justify-center shrink-0" title="工具调用">
                        <Wrench className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {meta.vision && (
                      <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded border border-blue-500/20 flex items-center justify-center shrink-0" title="视觉理解">
                        <Eye className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {meta.video && (
                      <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-1.5 rounded border border-purple-500/20 flex items-center justify-center shrink-0" title="视频理解">
                        <Video className="h-3.5 w-3.5" />
                      </span>
                    )}

                    {/* Context Window (At the last position with doubled background density) */}
                    <span className="text-xs bg-foreground/10 text-foreground/80 dark:bg-foreground/15 dark:text-foreground/90 px-2 py-0.5 rounded border border-foreground/10 font-semibold shrink-0" title="上下文窗口">
                      {formatContext(meta.context)}
                    </span>

                    <button
                      role="switch"
                      aria-checked={enabledModels[model] !== false}
                      onClick={() => setEnabledModels((prev) => ({ ...prev, [model]: prev[model] === false ? true : false }))}
                      className={`relative inline-flex h-5 w-8.5 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                        enabledModels[model] !== false ? "bg-foreground" : "bg-muted-foreground/25"
                      }`}
                    >
                      <span
                        className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          enabledModels[model] !== false ? "translate-x-[15px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        setEditingModel(model)
                        setModelForm(meta)
                        setShowModelModal(true)
                      }}
                      className="p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                      title="编辑模型"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmModel(model)}
                      className="p-1.5 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      title="删除模型"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            }

            if (filtered.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-border/60 rounded-xl bg-muted/20 text-center animate-in fade-in duration-200">
                  <div className="p-3 bg-muted/65 text-muted-foreground/60 rounded-full mb-3">
                    <Brain className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  <h3 className="text-[13px] font-semibold text-foreground/80 mb-1">
                    {modelList.length === 0 ? "暂无可用模型" : "未找到匹配模型"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground/70 max-w-[280px] leading-relaxed">
                    {modelList.length === 0 
                      ? "该服务商目前没有配置任何模型。请添加一个自定义模型以开始使用。" 
                      : "没有找到符合当前筛选条件的模型。您可以尝试切换标签。"}
                  </p>
                </div>
              )
            }

            return (
              <div>
                {enabledList.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground mb-1 mt-2">已启用</div>
                    {enabledList.map(renderRow)}
                  </>
                )}
                {disabledList.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground mb-1 mt-3">未启用</div>
                    {disabledList.map(renderRow)}
                  </>
                )}
              </div>
            )
          })()}
          </div>
        </div>

      {/* Custom Model modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200" onClick={() => setShowModelModal(false)}>
          <div className="bg-card rounded-xl border border-border/40 p-5 w-[420px] shadow-xl animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground/90">
                {editingModel ? "编辑自定义模型" : "添加自定义模型"}
              </h2>
              <button onClick={() => setShowModelModal(false)} className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">
                  模型 ID <span className="text-red-500 font-bold">*</span>
                </label>
                <Input 
                  value={modelForm.id} 
                  onChange={(e) => setModelForm({ ...modelForm, id: e.target.value.trim() })} 
                  placeholder="例如: deepseek-reasoner (必填)" 
                  className="h-9 text-sm font-mono"
                  disabled={!!editingModel}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">
                  模型名称 <span className="text-red-500 font-bold">*</span>
                </label>
                <Input 
                  value={modelForm.name} 
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} 
                  placeholder="例如: DeepSeek R1 (必填)" 
                  className="h-9 text-sm" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">模型类型</label>
                  <select
                    value={modelForm.type}
                    onChange={(e) => setModelForm({ ...modelForm, type: e.target.value })}
                    className="w-full h-9 rounded-md border border-border/40 bg-background px-2.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="文本">文本</option>
                    <option value="图像">图像</option>
                    <option value="视频">视频</option>
                    <option value="向量化">向量化</option>
                    <option value="ASR">ASR</option>
                    <option value="TTS">TTS</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">最大上下文</label>
                  <Input 
                    type="number"
                    value={modelForm.context} 
                    onChange={(e) => setModelForm({ ...modelForm, context: e.target.value })} 
                    placeholder="例如: 128000" 
                    className="h-9 text-sm" 
                  />
                </div>
              </div>

              {/* Switches for capabilities */}
              <div className="space-y-0.5 pt-2 border-t border-border/30">
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">模型能力</label>
                
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-foreground/80">深度思考</span>
                    <span className="text-[10px] text-muted-foreground/60">支持长链推理和深度思考过程的展示</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={modelForm.thinking}
                    onClick={() => setModelForm({ ...modelForm, thinking: !modelForm.thinking })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      modelForm.thinking ? "bg-foreground" : "bg-muted-foreground/25"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        modelForm.thinking ? "translate-x-[17px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-foreground/80">工具调用</span>
                    <span className="text-[10px] text-muted-foreground/60">支持 Function Calling 与外部插件工具调用</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={modelForm.tools}
                    onClick={() => setModelForm({ ...modelForm, tools: !modelForm.tools })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      modelForm.tools ? "bg-foreground" : "bg-muted-foreground/25"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        modelForm.tools ? "translate-x-[17px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-foreground/80">视觉理解</span>
                    <span className="text-[10px] text-muted-foreground/60">支持多模态图像输入和图片 analysis 能力</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={modelForm.vision}
                    onClick={() => setModelForm({ ...modelForm, vision: !modelForm.vision })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      modelForm.vision ? "bg-foreground" : "bg-muted-foreground/25"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        modelForm.vision ? "translate-x-[17px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-foreground/80">视频理解</span>
                    <span className="text-[10px] text-muted-foreground/60">支持视频流的多帧时序理解与多模态分析</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={modelForm.video}
                    onClick={() => setModelForm({ ...modelForm, video: !modelForm.video })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      modelForm.video ? "bg-foreground" : "bg-muted-foreground/25"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        modelForm.video ? "translate-x-[17px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button 
                onClick={() => setShowModelModal(false)} 
                className="h-8 px-4 text-[12px] rounded-md border border-border/40 hover:bg-muted/60 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleModelSubmit}
                disabled={!modelForm.id || !modelForm.name}
                className="h-8 px-4 text-[12px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {editingModel ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmModel && (() => {
        const meta = getModelMeta(deleteConfirmModel)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200" onClick={() => setDeleteConfirmModel(null)}>
            <div className="bg-card rounded-xl border border-border/40 p-5 w-[380px] shadow-xl animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-sm font-semibold text-foreground/90">删除模型</h2>
                <button onClick={() => setDeleteConfirmModel(null)} className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="text-xs text-muted-foreground leading-relaxed mb-5">
                确定要删除模型 <span className="text-foreground/90 font-semibold font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/30 mx-0.5">{meta.name}</span> 吗？删除后将无法恢复。
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button 
                  onClick={() => setDeleteConfirmModel(null)} 
                  className="h-8 px-4 text-[12px] rounded-md border border-border/40 hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const rest = modelList.filter((m) => m !== deleteConfirmModel)
                    onUpdate("models", joinModels(rest))
                    setDeleteConfirmModel(null)
                  }}
                  className="h-8 px-4 text-[12px] rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  确定删除
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
