import LlmProviderManager from "@/components/llm-provider-manager"

export default function LlmPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-background/35">
      <div className="max-w-2xl animate-in fade-in-50 duration-150">
        <LlmProviderManager />
      </div>
    </div>
  )
}
