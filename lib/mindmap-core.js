const NODE_WIDTH = 220
const NODE_HEIGHT = 84
const COLUMN_GAP = 320
const ROW_GAP = 132

const DEFAULT_COLORS = [
  "#dbeafe",
  "#dcfce7",
  "#fef3c7",
  "#fce7f3",
  "#ede9fe",
  "#e0f2fe",
]

function cleanLabel(label) {
  return String(label || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripMermaidShape(raw) {
  let value = raw.trim()
  let changed = true

  while (changed) {
    changed = false
    const pairs = [
      ["[", "]"],
      ["(", ")"],
      ["{", "}"],
    ]

    for (const [open, close] of pairs) {
      if (value.startsWith(open) && value.endsWith(close)) {
        value = value.slice(1, -1).trim()
        changed = true
      }
    }
  }

  return cleanLabel(value)
}

function createFallbackModel(title = "视频主题") {
  return {
    version: 1,
    title,
    nodes: [
      { id: "root", label: title, kind: "root" },
      { id: "overview", label: "核心内容", kind: "branch" },
      { id: "details", label: "关键细节", kind: "branch" },
      { id: "takeaways", label: "行动启发", kind: "branch" },
    ],
    edges: [
      { id: "root-overview", source: "root", target: "overview" },
      { id: "root-details", source: "root", target: "details" },
      { id: "root-takeaways", source: "root", target: "takeaways" },
    ],
  }
}

function normalizeModel(input, fallbackTitle = "视频主题") {
  if (!input || typeof input !== "object") return createFallbackModel(fallbackTitle)

  const nodes = Array.isArray(input.nodes) ? input.nodes : []
  const edges = Array.isArray(input.edges) ? input.edges : []
  const normalizedNodes = nodes
    .filter((node) => node && node.id && node.label)
    .map((node, index) => ({
      id: String(node.id),
      label: cleanLabel(node.label),
      summary: node.summary ? cleanLabel(node.summary) : undefined,
      timestamp: typeof node.timestamp === "number" ? node.timestamp : undefined,
      kind: node.kind || (index === 0 ? "root" : "branch"),
      color: node.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }))

  if (normalizedNodes.length === 0) return createFallbackModel(fallbackTitle)

  const nodeIds = new Set(normalizedNodes.map((node) => node.id))
  const normalizedEdges = edges
    .filter((edge) => edge && nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)))
    .map((edge) => ({
      id: edge.id ? String(edge.id) : `${edge.source}-${edge.target}`,
      source: String(edge.source),
      target: String(edge.target),
    }))

  return {
    version: 1,
    title: cleanLabel(input.title || normalizedNodes[0]?.label || fallbackTitle),
    nodes: normalizedNodes,
    edges: normalizedEdges,
  }
}

function parseJsonModel(value, fallbackTitle) {
  try {
    const parsed = JSON.parse(value)
    if (parsed && Array.isArray(parsed.nodes)) {
      return normalizeModel(parsed, fallbackTitle)
    }
  } catch {
    return null
  }

  return null
}

function parseMermaidModel(value, fallbackTitle) {
  const nodeMap = new Map()
  const edges = []
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("%%"))
    .filter((line) => !/^(flowchart|graph)\s+/i.test(line))

  const ensureNode = (id, label = id) => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        label: cleanLabel(label || id),
        kind: nodeMap.size === 0 ? "root" : "branch",
        color: DEFAULT_COLORS[nodeMap.size % DEFAULT_COLORS.length],
      })
    }
  }

  for (const line of lines) {
    const edgeMatch = line.match(/^([A-Za-z0-9_-]+)(?:\[.*?\]|\(.*?\)|\{.*?\})?\s*-+>+\s*([A-Za-z0-9_-]+)(?:\[.*?\]|\(.*?\)|\{.*?\})?/)
    if (edgeMatch) {
      ensureNode(edgeMatch[1])
      ensureNode(edgeMatch[2])
      edges.push({
        id: `${edgeMatch[1]}-${edgeMatch[2]}`,
        source: edgeMatch[1],
        target: edgeMatch[2],
      })
    }

    for (const match of line.matchAll(/([A-Za-z0-9_-]+)(\(\(.+?\)\)|\(.+?\)|\[.+?\]|\{.+?\})/g)) {
      const [, id, rawLabel] = match
      const label = stripMermaidShape(rawLabel)
      const current = nodeMap.get(id)
      nodeMap.set(id, {
        ...(current || {
          id,
          kind: nodeMap.size === 0 ? "root" : "branch",
          color: DEFAULT_COLORS[nodeMap.size % DEFAULT_COLORS.length],
        }),
        label,
      })
    }
  }

  if (nodeMap.size === 0) return createFallbackModel(fallbackTitle)

  const nodes = Array.from(nodeMap.values())
  nodes[0].kind = "root"

  return normalizeModel({
    title: fallbackTitle || nodes[0].label,
    nodes,
    edges,
  }, fallbackTitle)
}

function createMindmapModel(value, fallbackTitle = "视频主题") {
  if (!value) return createFallbackModel(fallbackTitle)
  if (typeof value === "object") return normalizeModel(value, fallbackTitle)

  const trimmed = String(value).trim()
  return parseJsonModel(trimmed, fallbackTitle) || parseMermaidModel(trimmed, fallbackTitle)
}

function buildTree(model) {
  const children = new Map()
  const incoming = new Set()

  for (const node of model.nodes) {
    children.set(node.id, [])
  }

  for (const edge of model.edges) {
    if (!children.has(edge.source) || !children.has(edge.target)) continue
    children.get(edge.source).push(edge.target)
    incoming.add(edge.target)
  }

  const root = model.nodes.find((node) => node.kind === "root") || model.nodes.find((node) => !incoming.has(node.id)) || model.nodes[0]
  return { root, children }
}

function collectDepths(rootId, children) {
  const depths = new Map([[rootId, 0]])
  const queue = [rootId]

  while (queue.length > 0) {
    const id = queue.shift()
    const depth = depths.get(id) || 0
    for (const childId of children.get(id) || []) {
      if (!depths.has(childId)) {
        depths.set(childId, depth + 1)
        queue.push(childId)
      }
    }
  }

  return depths
}

function layoutMindmap(modelInput) {
  const model = createMindmapModel(modelInput)
  const { root, children } = buildTree(model)
  const depths = collectDepths(root.id, children)
  const rowsByDepth = new Map()

  for (const node of model.nodes) {
    const depth = depths.get(node.id) ?? 1
    const row = rowsByDepth.get(depth) || []
    row.push(node.id)
    rowsByDepth.set(depth, row)
  }

  const positionedNodes = model.nodes.map((node) => {
    const depth = depths.get(node.id) ?? 1
    const row = rowsByDepth.get(depth) || [node.id]
    const index = row.indexOf(node.id)
    const offset = (row.length - 1) * ROW_GAP / 2

    return {
      id: node.id,
      type: "mindmapNode",
      position: {
        x: depth * COLUMN_GAP,
        y: index * ROW_GAP - offset,
      },
      data: node,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    }
  })

  return {
    nodes: positionedNodes,
    edges: model.edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: false,
    })),
  }
}

function walkMarkdown(nodeId, model, children, depth = 1, visited = new Set()) {
  if (visited.has(nodeId)) return []
  visited.add(nodeId)

  const node = model.nodes.find((item) => item.id === nodeId)
  if (!node) return []

  const prefix = "#".repeat(Math.min(depth, 6))
  const lines = [`${prefix} ${node.label}`]

  if (node.summary) lines.push("", node.summary)
  if (typeof node.timestamp === "number") lines.push("", `时间点: ${formatTimestamp(node.timestamp)}`)

  for (const childId of children.get(nodeId) || []) {
    lines.push("", ...walkMarkdown(childId, model, children, depth + 1, visited))
  }

  return lines
}

function exportMindmapToMarkdown(modelInput) {
  const model = createMindmapModel(modelInput)
  const { root, children } = buildTree(model)
  return `${walkMarkdown(root.id, model, children).join("\n")}\n`
}

function exportMindmapToObsidianCanvas(modelInput) {
  const model = createMindmapModel(modelInput)
  const layout = layoutMindmap(model)

  return {
    nodes: layout.nodes.map((node) => ({
      id: node.id,
      type: "text",
      text: node.data.summary ? `# ${node.data.label}\n\n${node.data.summary}` : node.data.label,
      x: node.position.x,
      y: node.position.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      color: node.data.color,
    })),
    edges: layout.edges.map((edge) => ({
      id: edge.id,
      fromNode: edge.source,
      fromSide: "right",
      toNode: edge.target,
      toSide: "left",
    })),
  }
}

function formatTimestamp(seconds) {
  const value = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(value / 60)
  const rest = value % 60
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

module.exports = {
  createMindmapModel,
  exportMindmapToMarkdown,
  exportMindmapToObsidianCanvas,
  formatTimestamp,
  layoutMindmap,
}
