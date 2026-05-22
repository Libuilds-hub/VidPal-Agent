"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Markmap } from "markmap-view"
import type { IPureNode } from "markmap-common"
import {
  FocusIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  UnfoldHorizontalIcon,
} from "lucide-react"
import {
  createMindmapModel,
  type MindmapModel,
} from "@/lib/mindmap-core"

interface MindMapProps {
  videoId?: string
  mermaidCode?: string | null
  onSaved?: (mindmap: string) => void
}

export function MindMap({ videoId, mermaidCode, onSaved }: MindMapProps) {
  const initialModel = useMemo(() => createMindmapModel(mermaidCode, "视频主题"), [mermaidCode])
  const [model, setModel] = useState<MindmapModel>(initialModel)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

    // Initialize all nodes — embed id in content as data attribute for click targeting
    for (const node of model.nodes) {
      nodeMap.set(node.id, {
        content: `<span data-node-id="${node.id}">${escapeHtml(node.label)}</span>`,
        children: [],
        payload: { id: node.id },
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
        initialExpandLevel: 99,
        pan: true,
        zoom: true,
      })
    }

    mmRef.current.setData(treeData)
    mmRef.current.fit()

    // Set up click handler for node selection
    const svg = svgRef.current
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element
      // Look for data-node-id on the clicked element or its ancestors
      const nodeElement = target.closest("[data-node-id]")
      if (nodeElement) {
        const nodeId = nodeElement.getAttribute("data-node-id")
        if (nodeId) {
          setSelectedNodeId(nodeId)
          e.stopPropagation()
          return
        }
      }
      setSelectedNodeId(null)
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

  const saveModel = useCallback(async (modelToSave: MindmapModel) => {
    if (!videoId) return
    setSaving(true)
    try {
      const payload = JSON.stringify({ nodes: modelToSave.nodes, edges: modelToSave.edges })
      const res = await fetch(`/api/video/${videoId}/mindmap`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mindmap: payload }),
      })
      if (!res.ok) throw new Error("Save failed")
      onSaved?.(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("Save mindmap error:", err)
    } finally {
      setSaving(false)
    }
  }, [videoId, onSaved])

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
    saveModel(nextModel)
  }, [draftLabel, model, selectedNode, saveModel])

  const addChildNode = useCallback(() => {
    if (!selectedNode) return

    const maxNum = model.nodes.reduce((max, node) => {
      const match = node.id.match(/^n(\d+)$/)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    const newId = `n${maxNum + 1}`
    const newEdgeId = `${selectedNode.id}-${newId}`
    const nextModel = {
      ...model,
      nodes: [...model.nodes, { id: newId, label: "新节点", kind: "branch" }],
      edges: [...model.edges, { id: newEdgeId, source: selectedNode.id, target: newId }],
    }

    setModel(nextModel)
    setSelectedNodeId(newId)
    // Don't auto-save — user will rename and click "应用" to save
  }, [model, selectedNode])

  const deleteNode = useCallback(() => {
    if (!selectedNode) return

    const descendants = new Set<string>()
    const collect = (nodeId: string) => {
      descendants.add(nodeId)
      for (const edge of model.edges) {
        if (edge.source === nodeId && !descendants.has(edge.target)) {
          collect(edge.target)
        }
      }
    }
    collect(selectedNode.id)

    const nextModel = {
      ...model,
      nodes: model.nodes.filter((node) => !descendants.has(node.id)),
      edges: model.edges.filter((edge) => !descendants.has(edge.source) && !descendants.has(edge.target)),
    }
    setModel(nextModel)
    setSelectedNodeId(null)
    saveModel(nextModel)
  }, [model, selectedNode, saveModel])

  const getCurrentScale = useCallback((): number => {
    const mm = mmRef.current
    if (!mm) return 2
    const g = mm.g.node()
    if (!g) return 2
    const t = g.getAttribute("transform") || ""
    const m = t.match(/scale\(([^)]+)\)/)
    return m ? parseFloat(m[1]) : 2
  }, [])

  const handleZoomIn = useCallback(() => {
    const currentScale = getCurrentScale()
    if (currentScale >= 8) return
    mmRef.current?.rescale(1.25)
  }, [getCurrentScale])

  const handleZoomOut = useCallback(() => {
    const currentScale = getCurrentScale()
    if (currentScale <= 0.25) return
    mmRef.current?.rescale(0.8)
  }, [getCurrentScale])

  const handleFit = useCallback(() => {
    mmRef.current?.fit()
  }, [])

  const handleToggleAll = useCallback(() => {
    const mm = mmRef.current
    if (!mm?.state.data) return
    mm.toggleNode(mm.state.data, true)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-background" style={{ backgroundImage: "radial-gradient(circle, oklch(0.75 0.002 240 / 0.35) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: "grab" }}
      />

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-0.5 rounded-md border border-border/40 bg-card/95 p-0.5 backdrop-blur-sm shadow-sm">
        <button
          type="button"
          title="放大"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground/60 transition-all duration-150 hover:bg-muted/80 hover:text-foreground/80"
          onClick={handleZoomIn}
        >
          <ZoomInIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="缩小"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground/60 transition-all duration-150 hover:bg-muted/80 hover:text-foreground/80"
          onClick={handleZoomOut}
        >
          <ZoomOutIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="适应窗口"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground/60 transition-all duration-150 hover:bg-muted/80 hover:text-foreground/80"
          onClick={handleFit}
        >
          <MaximizeIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="展开/折叠全部"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground/60 transition-all duration-150 hover:bg-muted/80 hover:text-foreground/80"
          onClick={handleToggleAll}
        >
          <UnfoldHorizontalIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        className={[
          "absolute bottom-4 left-1/2 z-10 w-[min(400px,calc(100%-2rem))] -translate-x-1/2 transition-all duration-200",
          selectedNode
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        {selectedNode && (
          <aside className="rounded-md border border-border/40 bg-card/98 p-3 shadow-sm backdrop-blur-sm">
            {/* Header */}
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
              <PencilIcon className="h-3 w-3 text-primary/70" />
              <span>{selectedNode.id === "root" ? "根节点" : "编辑节点"}</span>
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              <input
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") applyNodeLabel() }}
                autoFocus
              className="h-8 flex-1 rounded border border-border/40 bg-muted/50 px-2.5 text-[13px] outline-none transition focus:border-primary/40 focus:bg-background focus:ring-1 focus:ring-primary/10"
                placeholder="节点名称"
              />
              <button
                className={[
                  "inline-flex h-8 shrink-0 items-center gap-1 rounded px-2.5 text-[11px] font-medium transition active:scale-95",
                  saving
                    ? "bg-primary text-primary-foreground"
                    : saved
                      ? "bg-emerald-600 text-white"
                      : "bg-foreground text-background hover:bg-foreground/90",
                ].join(" ")}
                onClick={applyNodeLabel}
                disabled={saving}
              >
                {saving ? (
                  <SaveIcon className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    已保存
                  </>
                ) : (
                  "保存"
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="mt-2 flex items-center gap-2">
              <button
                className="inline-flex h-6 items-center gap-1 rounded border border-border/35 bg-card px-2 text-[11px] text-muted-foreground/70 transition hover:border-primary/25 hover:text-primary active:scale-95"
                onClick={addChildNode}
              >
                <PlusIcon className="h-3 w-3" />
                添加子节点
              </button>
              {selectedNode.id !== "root" && (
                <button
                className="inline-flex h-6 items-center gap-1 rounded border border-border/35 bg-card px-2 text-[11px] text-muted-foreground/70 transition hover:border-red-300 hover:text-red-600 active:scale-95"
                  onClick={deleteNode}
                >
                  <Trash2Icon className="h-3 w-3" />
                  删除
                </button>
              )}
            </div>

            {selectedNode.summary && (
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground/60 border-t border-border/30 pt-2">{selectedNode.summary}</p>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}