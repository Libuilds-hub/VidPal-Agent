// runtime/tests/tools-registry.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { z } from "zod"
import { ToolRegistry, type AgentTool } from "../tools/registry"

test("注册表：注册/列出/执行，参数校验失败抛错", async () => {
  const registry = new ToolRegistry()
  const schema = z.object({ a: z.number(), b: z.number() })
  const tool: AgentTool<typeof schema> = {
    name: "add",
    description: "两个数相加",
    inputSchema: schema,
    dangerous: false,
    async execute(args) {
      return { summary: String(args.a + args.b) }
    },
  }
  registry.register(tool)

  const listed = registry.list()
  assert.equal(listed.length, 1)
  assert.equal(listed[0].name, "add")
  assert.equal(listed[0].dangerous, false)
  assert.equal(listed[0].inputSchema, schema)

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

test("zod 默认值生效：invoke 传 parsed.data（含默认值）而非 raw args", async () => {
  const registry = new ToolRegistry()
  const schema = z.object({ n: z.number().default(42) })
  let received: unknown
  const tool: AgentTool<typeof schema> = {
    name: "defaults",
    description: "带默认值参数的工具",
    inputSchema: schema,
    dangerous: false,
    async execute(args) {
      received = args
      return { summary: String(args.n) }
    },
  }
  registry.register(tool)

  const result = await registry.invoke("defaults", {})
  assert.deepEqual(received, { n: 42 })
  assert.equal(result.summary, "42")
})

test("execute 抛错经 invoke 传播", async () => {
  const registry = new ToolRegistry()
  const tool: AgentTool = {
    name: "boom",
    description: "执行时抛错",
    inputSchema: z.object({}),
    dangerous: false,
    async execute() {
      throw new Error("boom")
    },
  }
  registry.register(tool)

  await assert.rejects(() => registry.invoke("boom", {}), /boom/)
})
