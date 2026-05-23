"use client"

import dynamic from "next/dynamic"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

interface Node {
  id: string
  name: string
  group: string
  color: string
  shape: "circle" | "square" | "triangle" | "diamond"
  val: number
}

interface Link {
  source: string
  target: string
}

const nodes: Node[] = [
  { id: "rag", name: "RAG 架构", group: "core", color: "#5E6AD2", shape: "circle", val: 2 },
  { id: "embedding", name: "Embedding", group: "storage", color: "#00B8D9", shape: "diamond", val: 1 },
  { id: "vector_db", name: "向量数据库", group: "storage", color: "#36B37E", shape: "diamond", val: 1 },
  { id: "chunking", name: "Chunk 策略", group: "data", color: "#FF5630", shape: "square", val: 1 },
  { id: "retrieval", name: "混合检索", group: "retrieval", color: "#FFAB00", shape: "triangle", val: 1.5 },
  { id: "llm", name: "大语言模型", group: "cognitive", color: "#9F7AEA", shape: "circle", val: 2 },
  { id: "prompt", name: "提示词工程", group: "cognitive", color: "#F687B3", shape: "triangle", val: 1 },
  { id: "rerank", name: "Rerank 重排", group: "retrieval", color: "#ED8936", shape: "triangle", val: 1 },
  { id: "metadata", name: "元数据过滤", group: "data", color: "#FF8A65", shape: "square", val: 1 },
  { id: "bm25", name: "BM25 检索", group: "retrieval", color: "#D69E2E", shape: "triangle", val: 1 },
  { id: "system_prompt", name: "系统提示词", group: "cognitive", color: "#B7791F", shape: "triangle", val: 1 },
  { id: "agent", name: "智能体", group: "cognitive", color: "#319795", shape: "circle", val: 1.5 },
  { id: "tool_calling", name: "工具调用", group: "cognitive", color: "#4FD1C5", shape: "diamond", val: 1 },
  { id: "memory", name: "记忆机制", group: "cognitive", color: "#3182CE", shape: "diamond", val: 1 },
  { id: "indexing", name: "文档索引", group: "data", color: "#E53E3E", shape: "square", val: 1 },
  { id: "knowledge_base", name: "外部知识库", group: "data", color: "#FC8181", shape: "square", val: 1 },
  { id: "semantic_search", name: "语义搜索", group: "retrieval", color: "#ECC94B", shape: "triangle", val: 1 },
  { id: "evaluation", name: "RAG 评估", group: "core", color: "#667EEA", shape: "circle", val: 1 },
]

const links: Link[] = [
  { source: "rag", target: "embedding" },
  { source: "rag", target: "vector_db" },
  { source: "rag", target: "chunking" },
  { source: "rag", target: "retrieval" },
  { source: "rag", target: "rerank" },
  { source: "rag", target: "llm" },
  { source: "rag", target: "evaluation" },
  { source: "embedding", target: "vector_db" },
  { source: "embedding", target: "semantic_search" },
  { source: "vector_db", target: "metadata" },
  { source: "chunking", target: "indexing" },
  { source: "chunking", target: "metadata" },
  { source: "retrieval", target: "bm25" },
  { source: "retrieval", target: "rerank" },
  { source: "retrieval", target: "semantic_search" },
  { source: "llm", target: "prompt" },
  { source: "llm", target: "agent" },
  { source: "llm", target: "system_prompt" },
  { source: "llm", target: "evaluation" },
  { source: "prompt", target: "system_prompt" },
  { source: "agent", target: "tool_calling" },
  { source: "agent", target: "memory" },
  { source: "indexing", target: "knowledge_base" },
]

function drawTriangle(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2
    const x = r * Math.cos(angle)
    const y = r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawSquare(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  ctx.rect(-r, -r, r * 2, r * 2)
}

function drawDiamond(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(r, 0)
  ctx.lineTo(0, r)
  ctx.lineTo(-r, 0)
  ctx.closePath()
}

export default function KnowledgeGraphPage() {
  return (
    <div className="w-full h-full">
      <ForceGraph2D
        graphData={{ nodes, links }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.name
          const fontSize = 12 / globalScale
          const r = (node.val * 6) / globalScale

          ctx.save()
          ctx.shadowColor = node.color + "66"
          ctx.shadowBlur = 8 / globalScale
          ctx.fillStyle = node.color
          ctx.strokeStyle = "rgba(255,255,255,0.4)"
          ctx.lineWidth = 1.5 / globalScale

          switch (node.shape) {
            case "triangle":
              drawTriangle(ctx, r)
              break
            case "square":
              drawSquare(ctx, r)
              break
            case "diamond":
              drawDiamond(ctx, r)
              break
            default:
              ctx.beginPath()
              ctx.arc(0, 0, r, 0, 2 * Math.PI)
          }

          ctx.fill()
          ctx.stroke()
          ctx.shadowBlur = 0

          // Label
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "top"
          ctx.fillStyle = "rgba(161, 161, 170, 0.9)"
          ctx.fillText(label, 0, r + 4 / globalScale)

          ctx.restore()
        }}
        nodeCanvasObjectMode={() => "replace"}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const r = node.val * 6
          switch (node.shape) {
            case "triangle":
              drawTriangle(ctx, r + 4)
              break
            case "square":
              drawSquare(ctx, r + 4)
              break
            case "diamond":
              drawDiamond(ctx, r + 4)
              break
            default:
              ctx.beginPath()
              ctx.arc(0, 0, r + 4, 0, 2 * Math.PI)
          }
          ctx.fillStyle = color
          ctx.fill()
        }}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={1.2}
        linkDirectionalParticleColor={() => "rgba(255,255,255,0.25)"}
        linkColor={() => "rgba(255,255,255,0.08)"}
        linkWidth={0.8}
        width={typeof window !== "undefined" ? window.innerWidth : 1200}
        height={typeof window !== "undefined" ? window.innerHeight - 56 : 800}
        warmupTicks={80}
        cooldownTicks={150}
        onEngineStop={(fg: any) => fg.zoomToFit(400, 80)}
        enableNodeDrag
        enableZoomInteraction
        enablePanInteraction
      />
    </div>
  )
}
