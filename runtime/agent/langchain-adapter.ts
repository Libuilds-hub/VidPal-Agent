// runtime/agent/langchain-adapter.ts —— 把 ToolRegistry 包装为 LangChain 工具（供 createReactAgent 使用）
import { tool, type StructuredTool } from "@langchain/core/tools"
import type { ToolRegistry } from "../tools/registry"

// 注：@langchain/core 1.x 中旧 BaseTool 更名为 StructuredTool（schema 工具的抽象基类），
// tool() 对 zod object schema 返回 DynamicStructuredTool，二者均可赋值给 StructuredTool。

/** 注册表 → LangChain StructuredTool[]；execute 的返回值（summary）作为工具结果 */
export function langchainToolsFromRegistry(registry: ToolRegistry): StructuredTool[] {
  return registry.list().map((meta) => {
    const t = registry.get(meta.name)!
    return tool(
      async (args: unknown) => {
        const result = await t.execute(args)
        return result.summary
      },
      {
        name: t.name,
        description: t.description,
        // schema 参数接受 InteropZodObject/ZodObject；ZodTypeAny 与其不严格兼容，as never 使其通过编译
        schema: t.inputSchema as never,
      }
    )
  })
}
