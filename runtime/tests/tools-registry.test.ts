// runtime/tests/tools-registry.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { z } from "zod"
import { ToolRegistry, type AgentTool } from "../tools/registry"

test("注册表：注册/列出/执行，参数校验失败抛错", async () => {
  const registry = new ToolRegistry()
  const tool: AgentTool = {
    name: "add",
    description: "两个数相加",
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    dangerous: false,
    async execute(args) {
      const { a, b } = args as { a: number; b: number }
      return { summary: String(a + b) }
    },
  }
  registry.register(tool)

  assert.equal(registry.list().length, 1)
  assert.equal(registry.list()[0].name, "add")
  assert.equal(registry.list()[0].dangerous, false)

  const result = await registry.invoke("add", { a: 1, b: 2 })
  assert.equal(result.summary, "3")

  await assert.rejects(() => registry.invoke("add", { a: "x" }), /参数校验失败/)
  await assert.rejects(() => registry.invoke("nope", {}), /未知工具/)
})

test("重复注册同名工具抛错", () => {
  const registry = new ToolRegistry()
  const tool: AgentTool = {
    name: "dup",
    description: "d",
    inputSchema: z.object({}),
    dangerous: false,
    async execute() {
      return { summary: "" }
    },
  }
  registry.register(tool)
  assert.throws(() => registry.register(tool), /已存在/)
})
