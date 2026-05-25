// lib/agent.ts
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { type BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
import { getChatModel, LLMNotConfiguredError, clearLLMCache } from "./llm"
import { searchVideosTool } from "./tools/search-videos"
import { searchTranscriptsTool } from "./tools/search-transcripts"
import { getVideoContextTool } from "./tools/get-video-context"
import { importVideoTool } from "./tools/import-video"

const SYSTEM_PROMPT = `你是"视频学习助手"，一个 AI 驱动的视频学习平台，帮助用户搜索、分析和理解视频内容。

## 你能做什么
- **searchVideos**: 在 B站 和 YouTube 上搜索学习视频
- **searchTranscripts**: 语义检索已导入视频的转写内容（跨视频查找概念）
- **getVideoContext**: 获取某个视频的结构化摘要（概述、关键要点、分段大纲）
- **importVideo**: 导入视频链接，后台异步处理（下载→转写→摘要→导图）

## 行为规则
1. 用户未指定搜索平台时，同时搜索 B站 和 YouTube
2. 搜索到结果后列出视频让用户选择，不要自动导入
3. 用户问视频内容时，先用 getVideoContext 获取概要，需要细节再用 searchTranscripts
4. 导入视频后明确告知用户"后台处理中，大约需要 3-8 分钟"
5. 导入前让用户确认要导入哪些视频
6. 回答问题时引用具体的视频标题和时间点
7. 如果 LLM API Key 未配置，引导用户去设置页配置（路径: ?settings=llm）`

let _agent: ReturnType<typeof createReactAgent> | null = null

async function getAgent() {
  if (_agent) return _agent
  const llm = await getChatModel()
  _agent = createReactAgent({
    llm,
    tools: [searchVideosTool, searchTranscriptsTool, getVideoContextTool, importVideoTool],
    messageModifier: SYSTEM_PROMPT,
  })
  return _agent
}

export async function runAgent(messages: BaseMessage[]) {
  const agent = await getAgent()
  return agent.streamEvents(
    { messages },
    {
      version: "v2",
      recursionLimit: 25,
    }
  )
}

export function clearAgentCache(): void {
  _agent = null
  clearLLMCache()
}

// Re-export for use in API route
export { LLMNotConfiguredError }
export { HumanMessage, AIMessage }
