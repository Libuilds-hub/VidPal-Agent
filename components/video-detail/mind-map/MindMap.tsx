"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type Node,
  type NodeProps,
  type NodeComponentProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  FocusIcon,
  GitBranchIcon,
  PencilIcon,
} from "lucide-react"
import {
  createMindmapModel,
  formatTimestamp,
  layoutMindmap,
  type MindmapModel,
  type MindmapNode,
} from "@/lib/mindmap-core"
import { cn } from "@/lib/utils"

interface MindMapProps {
  videoId?: string
  mermaidCode?: string | null
}

type FlowNode = Node<MindmapNode, "mindmapNode">

const nodeTypes = {
  mindmapNode: MindmapNodeCard,
}

// Custom edge with smooth bezier curves
function MindmapEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  })

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      stroke="#94a3b8"
      strokeWidth={2}
      fill="none"
    />
  )
}

// Wrapper for edge renderer
const edgeTypes = {
  mindmap: MindmapEdge,
}

function MindmapNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const isRoot = data.kind === "root"

  return (
    <div
      className={cn(
        "group relative rounded-2xl px-4 py-3.5 transition-all duration-200 cursor-grab active:cursor-grabbing",
        "hover:shadow-lg hover:-translate-y-0.5",
        selected && "ring-2 ring-blue-500 shadow-blue-100",
        isRoot
          ? "bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/20 border border-slate-700/50"
          : "bg-white shadow-md border border-slate-100",
      )}
      style={!isRoot ? { boxShadow: `0 4px 12px -2px rgba(0,0,0,0.06), 0 0 0 1px ${data.color || "#e2e8f0"}20, inset 0 1px 0 ${data.color || "#93c5fd"}40` } : undefined}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn("!h-3 !w-3 !bg-slate-300 !border-2 !border-white", isRoot && "!bg-blue-400")}
      />
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
            isRoot ? "bg-white/10 backdrop-blur-sm" : "bg-gradient-to-br from-slate-50 to-slate-100",
          )}
          style={!isRoot ? { background: `linear-gradient(135deg, ${data.color || "#93c5fd"}15, ${data.color || "#93c5fd"}05)` } : undefined}
        >
          {isRoot ? (
            <GitBranchIcon className="h-5 w-5 text-white" />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.color || "#93c5fd" }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-bold leading-tight", isRoot ? "text-white" : "text-slate-800")}>
            {data.label}
          </div>
          {data.summary && (
            <div className={cn("mt-1.5 line-clamp-2 text-xs leading-relaxed", isRoot ? "text-slate-300/80" : "text-slate-500")}>
              {data.summary}
            </div>
          )}
          {typeof data.timestamp === "number" && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                isRoot ? "bg-white/10 text-blue-200" : "bg-blue-50 text-blue-600",
              )}
            >
              {formatTimestamp(data.timestamp)}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-slate-300 !border-2 !border-white" />
    </div>
  )
}

export function MindMap({ videoId, mermaidCode }: MindMapProps) {
  const initialModel = useMemo(() => createMindmapModel(mermaidCode, "视频主题"), [mermaidCode])
  const initialLayout = useMemo(() => layoutMindmap(initialModel), [initialModel])
  const [model, setModel] = useState<MindmapModel>(initialModel)
  const [nodes, setNodes] = useState<FlowNode[]>(initialLayout.nodes as FlowNode[])
  const [edges, setEdges] = useState<Edge[]>(initialLayout.edges as Edge[])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState("")
  const [miniMapSize, setMiniMapSize] = useState({ width: 180, height: 120 })

  useEffect(() => {
    const nextModel = createMindmapModel(mermaidCode, "视频主题")
    const nextLayout = layoutMindmap(nextModel)
    setModel(nextModel)
    setNodes(nextLayout.nodes as FlowNode[])
    setEdges(nextLayout.edges as Edge[])
  }, [mermaidCode])

  useEffect(() => {
    if (nodes.length === 0) return

    const xs = nodes.map((n) => (n.position as { x: number }).x)
    const ys = nodes.map((n) => (n.position as { y: number }).y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs) + 220
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys) + 84

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    const maxWidth = 200
    const maxHeight = 150
    const scaleX = contentWidth > 0 ? maxWidth / contentWidth : 1
    const scaleY = contentHeight > 0 ? maxHeight / contentHeight : 1
    const scale = Math.min(scaleX, scaleY, 1)

    setMiniMapSize({
      width: Math.max(120, Math.min(200, Math.round(contentWidth * scale + 40))),
      height: Math.max(80, Math.min(120, Math.round(contentHeight * scale + 30))),
    })
  }, [nodes])

  const selectedNode = useMemo(
    () => model.nodes.find((node) => node.id === selectedNodeId) || null,
    [model.nodes, selectedNodeId],
  )

  useEffect(() => {
    setDraftLabel(selectedNode?.label || "")
  }, [selectedNode])

  const applyNodeLabel = useCallback(() => {
    if (!selectedNode || !draftLabel.trim()) return

    const nextModel = {
      ...model,
      nodes: model.nodes.map((node) =>
        node.id === selectedNode.id ? { ...node, label: draftLabel.trim() } : node,
      ),
    }
    const nextLayout = layoutMindmap(nextModel)
    setModel(nextModel)
    setNodes(nextLayout.nodes as FlowNode[])
    setEdges(nextLayout.edges as Edge[])
  }, [draftLabel, model, selectedNode])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f6f7f9]">
      <ReactFlow
        nodes={nodes}
        edges={edges.map((e) => ({ ...e, type: "mindmap" }))}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.25}
        maxZoom={1.4}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#d7dce3" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          style={{ width: miniMapSize.width, height: miniMapSize.height }}
          nodeColor={(node) => {
            const data = node.data as MindmapNode
            return data.kind === "root" ? "#020617" : data.color || "#dbeafe"
          }}
        />
      </ReactFlow>

      {selectedNode && (
        <aside className="absolute bottom-4 left-1/2 z-10 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
            <PencilIcon className="h-4 w-4 text-blue-600" />
            编辑节点
          </div>
          <div className="flex gap-2">
            <input
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              className="h-10 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={applyNodeLabel}
            >
              <FocusIcon className="h-4 w-4" />
              应用
            </button>
          </div>
          {selectedNode.summary && <p className="mt-3 text-xs leading-5 text-slate-500">{selectedNode.summary}</p>}
        </aside>
      )}
    </div>
  )
}