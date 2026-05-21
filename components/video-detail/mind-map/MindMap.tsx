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
  MoonIcon,
  SunIcon,
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
  const [dark, setDark] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)

  // Restore dark preference from localStorage on mount
  useEffect(() => {
    setDark(localStorage.getItem("mindmap-dark") === "1")
  }, [])

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

  const handleToggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      localStorage.setItem("mindmap-dark", next ? "1" : "0")
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    const mm = mmRef.current
    if (!mm?.state.data) return
    mm.toggleNode(mm.state.data, true)
  }, [])

  return (
    <div className={["relative h-full w-full overflow-hidden", dark ? "markmap-dark bg-[#1a1b26]" : "bg-[#f8fafc]"].join(" ")}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: "grab" }}
      />

      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          title="放大"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={handleZoomIn}
        >
          <ZoomInIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="缩小"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={handleZoomOut}
        >
          <ZoomOutIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="适应窗口"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={handleFit}
        >
          <MaximizeIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={dark ? "切换亮色主题" : "切换暗色主题"}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={handleToggleDark}
        >
          {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>
        <div className="mx-1 h-4 w-px bg-slate-200" />
        <button
          type="button"
          title="展开/折叠全部"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={handleToggleAll}
        >
          <UnfoldHorizontalIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        className={[
          "absolute bottom-4 left-1/2 z-10 w-[min(460px,calc(100%-2rem))] -translate-x-1/2 transition-all duration-300",
          selectedNode
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        {selectedNode && (
          <aside className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-200/50 backdrop-blur">
            {/* Header: path breadcrumb + close hit area */}
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                <PencilIcon className="h-3.5 w-3.5 text-blue-600" />
              </span>
              <span className="text-xs font-medium text-slate-400">{selectedNode.id === "root" ? "根节点" : "子节点"}</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-700 truncate">{selectedNode.label}</span>
            </div>

            {/* Main input row */}
            <div className="flex gap-2.5">
              <input
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") applyNodeLabel() }}
                autoFocus
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition-all placeholder:text-slate-350 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="输入节点名称"
              />
              <button
                className={[
                  "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-all active:scale-95",
                  saving
                    ? "bg-blue-600 text-white"
                    : saved
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md hover:shadow-slate-200",
                ].join(" ")}
                onClick={applyNodeLabel}
                disabled={saving}
              >
                {saving ? (
                  <SaveIcon className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    已保存
                  </>
                ) : (
                  <>
                    <FocusIcon className="h-4 w-4" />
                    应用并保存
                  </>
                )}
              </button>
            </div>

            {/* Action row */}
            <div className="mt-3 flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 active:scale-[0.97]"
                onClick={addChildNode}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                添加子节点
              </button>
              {selectedNode.id !== "root" && (
                <button
                  className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 text-sm font-medium text-red-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.97]"
                  onClick={deleteNode}
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                  删除节点
                </button>
              )}
            </div>

            {selectedNode.summary && (
              <p className="mt-3 text-xs leading-5 text-slate-400 border-t border-slate-100 pt-3">{selectedNode.summary}</p>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}