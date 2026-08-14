// runtime/tools/registry.ts —— 工具注册表：统一接口 + zod 参数校验 + dangerous 标记
import { z } from "zod"

export interface ToolResult {
  /** 给 LLM 的摘要（必须小，防上下文爆炸） */
  summary: string
  /** 大结果存 artifact 的引用（P3 提供 artifact 存储，本计划先留空） */
  artifactId?: string
}

export interface AgentTool {
  name: string
  description: string
  inputSchema: z.ZodTypeAny
  dangerous: boolean
  execute(args: unknown): Promise<ToolResult>
}

export class ToolRegistry {
  private tools = new Map<string, AgentTool>()

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 ${tool.name} 已存在`)
    }
    this.tools.set(tool.name, tool)
  }

  list(): Array<{ name: string; description: string; dangerous: boolean }> {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      dangerous: t.dangerous,
    }))
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name)
  }

  async invoke(name: string, args: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`未知工具: ${name}`)
    const parsed = tool.inputSchema.safeParse(args)
    if (!parsed.success) {
      throw new Error(
        `工具 ${name} 参数校验失败: ${JSON.stringify(parsed.error.flatten())}`
      )
    }
    return tool.execute(parsed.data)
  }
}
