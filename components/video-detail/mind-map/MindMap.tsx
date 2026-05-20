"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Markmap } from "markmap-view"
import type { IPureNode } from "markmap-common"
import {
  FocusIcon,
  PencilIcon,
} from "lucide-react"
import {
  createMindmapModel,
  type MindmapModel,
} from "@/lib/mindmap-core"

interface MindMapProps {
  videoId?: string
  mermaidCode?: string | null
}

export function MindMap({ videoId, mermaidCode }: MindMapProps) {
  const initialModel = useMemo(() => createMindmapModel(mermaidCode, "视频主题"), [mermaidCode])
  const [model, setModel] = useState<MindmapModel>(initialModel)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState("")
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)

  useEffect(() => {
    const nextModel = createMindmapModel(mermaidCode, "视频主题")
    setModel(nextModel)
  }, [mermaidCode])

  // Build IPureNode tree structure from model
  const treeData = useMemo((): IPureNode => {
    const childrenMap = new Map<string, IPureNode[]>()
    const nodeMap = new Map<string, IPureNode>()

    // Initialize all nodes
    for (const node of model.nodes) {
      nodeMap.set(node.id, {
        content: node.label,
        children: [],
      })
      childrenMap.set(node.id, [])
    }

    // Build parent-child relationships
    for (const edge of model.edges) {
      const parent = nodeMap.get(edge.source)
      const child = nodeMap.get(edge.target)
      if (parent && child) {
        childrenMap.get(edge.source)?.push(child)
      }
    }

    // Update children arrays
    for (const [nodeId, children] of childrenMap) {
      const node = nodeMap.get(nodeId)
      if (node) {
        node.children = children
      }
    }

    // Find root (node with no incoming edges)
    const hasIncoming = new Set(model.edges.map((e) => e.target))
    const rootNode = model.nodes.find((n) => !hasIncoming.has(n.id)) || model.nodes[0]

    return nodeMap.get(rootNode?.id || model.nodes[0]?.id || "") || {
      content: model.title,
      children: [],
    }
  }, [model])

  useEffect(() => {
    if (!svgRef.current) return

    if (!mmRef.current) {
      mmRef.current = Markmap.create(svgRef.current, {
        duration: 300,
        maxWidth: 260,
        nodeMinHeight: 36,
        paddingX: 12,
        spacingHorizontal: 24,
        spacingVertical: 12,
        initialExpandLevel: 2,
        pan: true,
        zoom: true,
      })
    }

    mmRef.current.setData(treeData)
    mmRef.current.fit()

    // Set up click handler for node selection
    const svg = svgRef.current
    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement
      const nodeElement = target.closest("g[data-id]")
      if (nodeElement) {
        const dataId = nodeElement.getAttribute("data-id")
        if (dataId) {
          setSelectedNodeId(dataId)
        }
      } else {
        setSelectedNodeId(null)
      }
    }

    svg.addEventListener("click", handleClick)
    return () => {
      svg.removeEventListener("click", handleClick)
    }
  }, [treeData])

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
    setModel(nextModel)
    setSelectedNodeId(null)
  }, [draftLabel, model, selectedNode])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f8fafc]">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: "grab" }}
      />

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