// runtime/tools/registry.ts —— 工具注册表：统一接口 + zod 参数校验 + dangerous 标记
import { z } from "zod"

export interface ToolResult {
  /** 给 LLM 的摘要（必须小，防上下文爆炸） */
  summary: string
  /** 大结果存 artifact 的引用（P3 提供 artifact 存储，本计划先留空） */
  artifactId?: string
}

/** 工具元信息（list() 输出，P3 生成 tool-calling schema 用） */
export interface ToolMeta {
  name: string
  description: string
  dangerous: boolean
  inputSchema: z.ZodTypeAny
}

export interface AgentTool<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  description: string
  inputSchema: TInput
  dangerous: boolean
  /** args 是 zod OUTPUT（defaults/transforms 已应用），无需在工具内再 cast */
  execute(args: z.output<TInput>): Promise<ToolResult>
}

export class ToolRegistry {
  private tools = new Map<string, AgentTool>()

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 ${tool.name} 已存在`)
    }
    this.tools.set(tool.name, tool)
  }

  list(): ToolMeta[] {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      dangerous: t.dangerous,
      inputSchema: t.inputSchema,
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
        `工具 ${name} 参数校验失败: ${z.prettifyError(parsed.error)}`
      )
    }
    return tool.execute(parsed.data)
  }
}
