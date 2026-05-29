import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import LlmProviderManager from "@/components/llm-provider-manager"

export default function LlmPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <SettingsPageHeader title="AI 供应商" description="配置 AI 辅助模型连接与测试 API 状态" />
      <div className="max-w-2xl animate-in fade-in-50 duration-150">
        <LlmProviderManager />
      </div>
    </div>
  )
}
