// runtime/tests/video-tools.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { createImportVideoTool } from "../agent/tools/import-video"
import { createGetVideoContextTool } from "../agent/tools/get-video-context"
import { createSearchVideosTool } from "../agent/tools/search-videos"

test("import_video 工具：直接入队（非 HTTP 回环），按 URL 识别来源", async () => {
  const enqueued: Array<{ type: string; input: unknown; idempotencyKey: string }> = []
  const tool = createImportVideoTool({
    enqueue: (input) => {
      enqueued.push(input as never)
      return { taskId: "t-" + enqueued.length }
    },
  })
  const r = await tool.execute({
    urls: ["https://www.bilibili.com/video/BV1x", "https://youtu.be/abc"],
  })
  assert.equal(enqueued.length, 2)
  assert.equal((enqueued[0].input as { source: string }).source, "bilibili")
  assert.equal((enqueued[1].input as { source: string }).source, "youtube")
  assert.match(r.summary, /已开始导入 2 个视频/)
  assert.equal(enqueued[0].idempotencyKey, "video:https://www.bilibili.com/video/BV1x")
})

test("工具 schema 校验：缺参数被拒", async () => {
  const tool = createGetVideoContextTool()
  const parsed = tool.inputSchema.safeParse({})
  assert.equal(parsed.success, false)
})

test("search_videos schema：默认值生效", async () => {
  const tool = createSearchVideosTool()
  const parsed = tool.inputSchema.safeParse({ keyword: "react" })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.source, "all")
    assert.equal(parsed.data.count, 5)
  }
})
