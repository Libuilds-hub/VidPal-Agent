import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const {
  createMindmapModel,
  exportMindmapToMarkdown,
  exportMindmapToObsidianCanvas,
  layoutMindmap,
} = require("../lib/mindmap-core.js")

const mermaid = `
flowchart TB
  root([视频主题])
  bg[背景与现状]
  idea[关键概念]
  detail[核心定义]
  root --> bg
  root --> idea
  idea --> detail
`

const model = createMindmapModel(mermaid, "视频主题")

assert.equal(model.title, "视频主题")
assert.equal(model.nodes.length, 4)
assert.deepEqual(
  model.edges.map((edge) => `${edge.source}->${edge.target}`),
  ["root->bg", "root->idea", "idea->detail"],
)

const layout = layoutMindmap(model)
assert.equal(layout.nodes.find((node) => node.id === "root")?.position.x, 0)
assert.equal(layout.nodes.find((node) => node.id === "idea")?.position.x, 320)
assert.equal(layout.nodes.find((node) => node.id === "detail")?.position.x, 640)

const markdown = exportMindmapToMarkdown(model)
assert.match(markdown, /^# 视频主题/m)
assert.match(markdown, /## 背景与现状/)
assert.match(markdown, /### 核心定义/)

const canvas = exportMindmapToObsidianCanvas(model)
assert.equal(canvas.nodes.length, model.nodes.length)
assert.equal(canvas.edges.length, model.edges.length)
assert.equal(canvas.nodes.find((node) => node.id === "idea")?.type, "text")

const noisyModel = createMindmapModel(`
<think>
  root([这个不应该出现])
</think>
\`\`\`mermaid
flowchart LR
  root([真正主题])
  branch[有效分支]
  root --> branch
\`\`\`
`, "真正主题")

assert.equal(noisyModel.nodes.length, 2)
assert.equal(noisyModel.nodes[0].label, "真正主题")
assert.equal(noisyModel.nodes[1].label, "有效分支")

console.log("mindmap core tests passed")
