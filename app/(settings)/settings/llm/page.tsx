import LlmProviderManager from "@/components/llm-provider-manager"

export default function LlmPage() {
  return (
    <div className="flex-1 flex flex-col bg-background/35 overflow-hidden">
      <LlmProviderManager />
    </div>
  )
}
