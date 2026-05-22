"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import {
  Maximize2Icon,
  SlidersIcon,
  RotateCcwIcon,
  ZoomInIcon,
  ZoomOutIcon,
  SearchIcon,
  XIcon,
  SettingsIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ConceptNode {
  id: string
  name: string
  fullName: string
  group: "core" | "data" | "storage" | "retrieval" | "cognitive"
  color: string
  related: string[]
}

// 18 Core nodes representing a rich knowledge network
const conceptsData: Record<string, ConceptNode> = {
  rag: {
    id: "rag",
    name: "RAG 架构",
    fullName: "Retrieval-Augmented Generation / 检索增强生成",
    group: "core",
    color: "#5E6AD2", // Indigo
    related: ["embedding", "vector_db", "chunking", "retrieval", "rerank", "llm", "evaluation"],
  },
  embedding: {
    id: "embedding",
    name: "Embedding",
    fullName: "Embedding Vectors / 文本向量表征",
    group: "storage",
    color: "#00B8D9", // Cyan
    related: ["rag", "vector_db", "semantic_search"],
  },
  vector_db: {
    id: "vector_db",
    name: "向量数据库",
    fullName: "Vector Database / 向量搜索引擎",
    group: "storage",
    color: "#36B37E", // Emerald
    related: ["rag", "embedding", "metadata"],
  },
  chunking: {
    id: "chunking",
    name: "Chunk 策略",
    fullName: "Text Chunking Strategies / 文本分块策略",
    group: "data",
    color: "#FF5630", // Rose
    related: ["rag", "indexing", "metadata"],
  },
  retrieval: {
    id: "retrieval",
    name: "混合检索",
    fullName: "Hybrid Retrieval / 多路混合检索",
    group: "retrieval",
    color: "#FFAB00", // Amber
    related: ["rag", "bm25", "rerank", "semantic_search"],
  },
  llm: {
    id: "llm",
    name: "大语言模型",
    fullName: "Large Language Model / 生成决策大脑",
    group: "cognitive",
    color: "#9F7AEA", // Purple
    related: ["rag", "prompt", "agent", "system_prompt", "evaluation"],
  },
  prompt: {
    id: "prompt",
    name: "提示词工程",
    fullName: "Prompt Engineering / 上下文指令定义",
    group: "cognitive",
    color: "#F687B3", // Pink
    related: ["llm", "system_prompt"],
  },
  rerank: {
    id: "rerank",
    name: "Rerank 重排",
    fullName: "Re-ranking Models / 语义相关性二次排序",
    group: "retrieval",
    color: "#ED8936", // Orange
    related: ["rag", "retrieval"],
  },
  metadata: {
    id: "metadata",
    name: "元数据过滤",
    fullName: "Metadata Filtering / 结构化属性修剪",
    group: "data",
    color: "#FF8A65", // Light coral
    related: ["vector_db", "chunking"],
  },
  bm25: {
    id: "bm25",
    name: "BM25 检索",
    fullName: "BM25 Lexical Search / 词频逆文档频率检索",
    group: "retrieval",
    color: "#D69E2E", // Dark yellow
    related: ["retrieval"],
  },
  system_prompt: {
    id: "system_prompt",
    name: "系统提示词",
    fullName: "System Prompts / 全局行为约束",
    group: "cognitive",
    color: "#B7791F", // Mustard
    related: ["llm", "prompt"],
  },
  agent: {
    id: "agent",
    name: "智能体",
    fullName: "AI Agent / 自主规划决策系统",
    group: "cognitive",
    color: "#319795", // Teal
    related: ["llm", "tool_calling", "memory"],
  },
  tool_calling: {
    id: "tool_calling",
    name: "工具调用",
    fullName: "Function Calling / 外部 API 交互",
    group: "cognitive",
    color: "#4FD1C5", // Mint
    related: ["agent"],
  },
  memory: {
    id: "memory",
    name: "记忆机制",
    fullName: "Memory Buffer / 历史会话持久化",
    group: "cognitive",
    color: "#3182CE", // Deep blue
    related: ["agent"],
  },
  indexing: {
    id: "indexing",
    name: "文档索引",
    fullName: "Document Indexing / 数据管道构建",
    group: "data",
    color: "#E53E3E", // Strong red
    related: ["chunking", "knowledge_base"],
  },
  knowledge_base: {
    id: "knowledge_base",
    name: "外部知识库",
    fullName: "External Knowledge Base / 专属语料仓储",
    group: "data",
    color: "#FC8181", // Light red
    related: ["indexing"],
  },
  semantic_search: {
    id: "semantic_search",
    name: "语义搜索",
    fullName: "Dense Vector Search / 概念对齐检索",
    group: "retrieval",
    color: "#ECC94B", // Yellow
    related: ["embedding", "retrieval"],
  },
  evaluation: {
    id: "evaluation",
    name: "RAG 评估",
    fullName: "RAG Evaluation / 生成与检索量化指标",
    group: "core",
    color: "#667EEA", // Soft purple indigo
    related: ["rag", "llm"],
  },
}

interface PhysicsNode extends ConceptNode {
  x: number
  y: number
  vx: number
  vy: number
}

interface PhysicsLink {
  source: string
  target: string
}

export default function KnowledgeGraphPage() {
  const [activeNodeId, setActiveNodeId] = useState<string>("rag")
  const [searchQuery, setSearchQuery] = useState("")

  // Physics tuning parameters
  const [repulsionStrength, setRepulsionStrength] = useState(8000)
  const [linkStrength, setLinkStrength] = useState(0.09)
  const [desiredLinkLength, setDesiredLinkLength] = useState(110)
  const [gravityStrength, setGravityStrength] = useState(0.016)
  const [damping, setDamping] = useState(0.85)
  const [nodeSizeScale, setNodeSizeScale] = useState(1.1)

  // Display toggles
  const [showLabels, setShowLabels] = useState(true)
  const [showConnections, setShowConnections] = useState(true)
  const [freezePhysics, setFreezePhysics] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

  // Filters by category
  const [activeGroups, setActiveGroups] = useState<Record<string, boolean>>({
    core: true,
    data: true,
    storage: true,
    retrieval: true,
    cognitive: true,
  })

  // Navigation: Zoom and Pan
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState({ x: 100, y: 80 })
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Hover focus state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Draggable Node logic
  const draggedNodeIdRef = useRef<string | null>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const nodeStartPos = useRef({ x: 0, y: 0 })

  // Initialize nodes in a nice ring layout to prevent massive initial collision overlaps
  const initialNodes = useMemo(() => {
    const nodes = Object.entries(conceptsData).map(([id, data], idx, arr) => {
      const angle = (idx / arr.length) * 2 * Math.PI
      const radius = 200
      return {
        ...data,
        x: 350 + Math.cos(angle) * radius,
        y: 250 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
      }
    })
    return nodes
  }, [])

  const nodesRef = useRef<PhysicsNode[]>(initialNodes)
  const [tickState, setTickState] = useState(0)

  // Get active nodes filtered by categories
  const filteredNodes = useMemo(() => {
    const activeNodes = nodesRef.current.filter(node => activeGroups[node.group])
    return activeNodes
  }, [tickState, activeGroups])

  const filteredNodeIds = useMemo(() => {
    return new Set(filteredNodes.map(n => n.id))
  }, [filteredNodes])

  // Connect links dynamically based on filtered nodes
  const links = useMemo(() => {
    const connectedLinks: PhysicsLink[] = []
    Object.values(conceptsData).forEach(node => {
      if (!filteredNodeIds.has(node.id)) return
      node.related.forEach(relId => {
        if (!filteredNodeIds.has(relId)) return
        // Prevent duplicate undirected edges
        const exists = connectedLinks.some(
          l => (l.source === node.id && l.target === relId) || (l.source === relId && l.target === node.id)
        )
        if (!exists) {
          connectedLinks.push({ source: node.id, target: relId })
        }
      })
    })
    return connectedLinks
  }, [filteredNodeIds])

  // Custom Physics simulation tick loop inside useEffect
  useEffect(() => {
    if (freezePhysics) return

    let animId: number

    const tick = () => {
      const nodes = nodesRef.current

      // 1. Repulsion (Coulomb Repulsion Force)
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i]
        if (!filteredNodeIds.has(nodeA.id)) continue

        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j]
          if (!filteredNodeIds.has(nodeB.id)) continue

          const dx = nodeA.x - nodeB.x
          const dy = nodeA.y - nodeB.y
          const distSq = dx * dx + dy * dy
          const dist = Math.sqrt(distSq) || 0.1

          // Only repel if reasonably within reach
          if (dist < 450) {
            const force = repulsionStrength / distSq
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force

            nodeA.vx += fx
            nodeA.vy += fy
            nodeB.vx -= fx
            nodeB.vy -= fy
          }
        }
      }

      // 2. Link Attraction (Hooke's Spring Law)
      links.forEach(link => {
        const nodeA = nodes.find(n => n.id === link.source)
        const nodeB = nodes.find(n => n.id === link.target)
        if (!nodeA || !nodeB) return

        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        const force = (dist - desiredLinkLength) * linkStrength
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        nodeA.vx += fx
        nodeA.vy += fy
        nodeB.vx -= fx
        nodeB.vy -= fy
      })

      // 3. Central Gravity Pull
      const centerX = 350
      const centerY = 250
      nodes.forEach(node => {
        if (!filteredNodeIds.has(node.id)) return
        const dx = centerX - node.x
        const dy = centerY - node.y
        node.vx += dx * gravityStrength
        node.vy += dy * gravityStrength
      })

      // 4. Friction viscous decay & Update node positions
      nodes.forEach(node => {
        if (node.id === draggedNodeIdRef.current) {
          // Keep velocity zero when dragged
          node.vx = 0
          node.vy = 0
        } else {
          node.vx *= damping
          node.vy *= damping

          // Velocity capping to prevent system explosion
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
          const maxSpeed = 10
          if (speed > maxSpeed) {
            node.vx = (node.vx / speed) * maxSpeed
            node.vy = (node.vy / speed) * maxSpeed
          }

          node.x += node.vx
          node.y += node.vy
        }
      })

      // Trigger react render update
      setTickState(t => t + 1)
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [
    freezePhysics,
    filteredNodeIds,
    links,
    repulsionStrength,
    linkStrength,
    desiredLinkLength,
    gravityStrength,
    damping,
  ])

  // Mouse wheel zoom integration (non-passive to prevent standard web scrolling)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = 0.08
      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const factor = e.deltaY < 0 ? 1 + zoomFactor : 1 - zoomFactor
      const nextZoom = Math.min(Math.max(zoom * factor, 0.15), 3.5)

      // Keep screen pointer invariant
      const svgX = (mouseX - pan.x) / zoom
      const svgY = (mouseY - pan.y) / zoom

      setZoom(nextZoom)
      setPan({
        x: mouseX - svgX * nextZoom,
        y: mouseY - svgY * nextZoom,
      })
    }

    svg.addEventListener("wheel", handleWheel, { passive: false })
    return () => svg.removeEventListener("wheel", handleWheel)
  }, [zoom, pan])

  // Handle Drag & Drop of node elements
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = filteredNodes.find(n => n.id === nodeId)
    if (!node) return

    draggedNodeIdRef.current = nodeId
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    nodeStartPos.current = { x: node.x, y: node.y }

    // Bind window-wide listeners to support dragging off-canvas gracefully
    window.addEventListener("mousemove", handleGlobalMouseMove)
    window.addEventListener("mouseup", handleGlobalMouseUp)
  }

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggedNodeIdRef.current) return
    const dx = e.clientX - dragStartPos.current.x
    const dy = e.clientY - dragStartPos.current.y

    // Offset is adjusted by the zoom scale
    const svgDx = dx / zoom
    const svgDy = dy / zoom

    const node = nodesRef.current.find(n => n.id === draggedNodeIdRef.current)
    if (node) {
      node.x = nodeStartPos.current.x + svgDx
      node.y = nodeStartPos.current.y + svgDy
      node.vx = 0
      node.vy = 0
      setTickState(t => t + 1)
    }
  }

  const handleGlobalMouseUp = (e: MouseEvent) => {
    if (draggedNodeIdRef.current) {
      const dx = e.clientX - dragStartPos.current.x
      const dy = e.clientY - dragStartPos.current.y
      const totalMovement = Math.sqrt(dx * dx + dy * dy)

      // Click vs Drag discrimination
      if (totalMovement < 4) {
        setActiveNodeId(draggedNodeIdRef.current)
      }

      draggedNodeIdRef.current = null
    }
    window.removeEventListener("mousemove", handleGlobalMouseMove)
    window.removeEventListener("mouseup", handleGlobalMouseUp)
  }

  // Panning controls for dragging the background grid
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })

  const handleBgMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleBgMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    })
  }

  const handleBgMouseUpOrLeave = () => {
    setIsPanning(false)
  }

  // Auto-centering bounding box logic (Figma/Miro standard)
  const autoCenter = () => {
    if (filteredNodes.length === 0 || !svgRef.current) return
    
    // Calculate bounding coordinates
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    filteredNodes.forEach(node => {
      if (node.x < minX) minX = node.x
      if (node.x > maxX) maxX = node.x
      if (node.y < minY) minY = node.y
      if (node.y > maxY) maxY = node.y
    })

    const graphW = maxX - minX || 1
    const graphH = maxY - minY || 1
    const graphCenterX = minX + graphW / 2
    const graphCenterY = minY + graphH / 2

    const rect = svgRef.current.getBoundingClientRect()
    const viewW = rect.width
    const viewH = rect.height

    const padding = 70
    const zoomX = (viewW - padding * 2) / graphW
    const zoomY = (viewH - padding * 2) / graphH
    const nextZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.35), 1.5)

    setZoom(nextZoom)
    setPan({
      x: viewW / 2 - graphCenterX * nextZoom,
      y: viewH / 2 - graphCenterY * nextZoom,
    })
  }

  // Zoom In / Zoom Out controls
  const zoomIn = () => {
    setZoom(z => Math.min(z * 1.15, 3.5))
  }

  const zoomOut = () => {
    setZoom(z => Math.max(z / 1.15, 0.15))
  }

  const resetView = () => {
    setZoom(0.8)
    setPan({ x: 100, y: 80 })
  }

  // Run auto-centering on mount when DOM is ready
  useEffect(() => {
    setTimeout(autoCenter, 150)
  }, [])

  // Hover highlighting calculations
  const adjacentNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>()
    const node = conceptsData[hoveredNodeId]
    if (!node) return new Set<string>()
    return new Set<string>([hoveredNodeId, ...node.related])
  }, [hoveredNodeId])

  const searchMatchingIds = useMemo(() => {
    if (!searchQuery.trim()) return null
    const query = searchQuery.toLowerCase().trim()
    return new Set(
      Object.values(conceptsData)
        .filter(n => n.name.toLowerCase().includes(query) || n.fullName.toLowerCase().includes(query))
        .map(n => n.id)
    )
  }, [searchQuery])

  return (
    <div className="flex flex-1 h-full w-full relative overflow-hidden bg-background select-none">
      
      {/* Full viewport background dot mesh */}
      <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(var(--border)_1.5px,transparent_1.5px)] [background-size:18px_18px] z-0" />

      {/* Floating Header / Status Label */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-background/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/40 shadow-sm pointer-events-auto">
        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest font-mono">
          Relation Graph
        </span>
        <span className="h-3 w-px bg-border/45" />
        <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
          {filteredNodes.length} 实体 · {links.length} 拓扑连线
        </span>
      </div>

      {/* Floating Toolbar & Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        
        {/* Dynamic search input inside graph canvas */}
        <div className="relative group">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="搜索概念实体..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 h-8 pl-8 pr-7 rounded-lg border border-border/45 bg-background/80 backdrop-blur-md text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:bg-background/95 transition-all font-medium shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-background/80 backdrop-blur-md rounded-lg border border-border/45 shadow-sm overflow-hidden h-8">
          <button
            onClick={zoomIn}
            className="w-8 h-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/15 transition-all"
            title="放大"
          >
            <ZoomInIcon className="size-3.5" />
          </button>
          <span className="h-3 w-px bg-border/40" />
          <button
            onClick={zoomOut}
            className="w-8 h-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/15 transition-all"
            title="缩小"
          >
            <ZoomOutIcon className="size-3.5" />
          </button>
          <span className="h-3 w-px bg-border/40" />
          <button
            onClick={resetView}
            className="w-8 h-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/15 transition-all"
            title="重置缩放"
          >
            <RotateCcwIcon className="size-3.5" />
          </button>
          <span className="h-3 w-px bg-border/40" />
          <button
            onClick={autoCenter}
            className="w-8 h-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/15 transition-all"
            title="自适应聚焦居中"
          >
            <Maximize2Icon className="size-3.5" />
          </button>
        </div>

        {/* Settings Panel Trigger */}
        <button
          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
          className={cn(
            "h-8 px-2.5 rounded-lg border border-border/45 bg-background/80 backdrop-blur-md flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-all shadow-sm",
            showSettingsPanel && "border-primary/50 bg-primary/5 text-primary hover:text-primary hover:bg-primary/10"
          )}
          title="图谱设置"
        >
          <SlidersIcon className="size-3.5 shrink-0" />
          <span>设置</span>
        </button>
      </div>

      {/* Obsidian Collapsible Settings Floating Panel */}
      {showSettingsPanel && (
        <div className="absolute right-4 top-14 w-64 bg-background/95 backdrop-blur-md border border-border/45 shadow-[0_8px_30px_rgb(0,0,0,0.25)] rounded-xl p-4 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-[11px] text-muted-foreground space-y-4 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-border/30 pb-2">
            <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
              <SettingsIcon className="size-3.5 text-primary" />
              <span>图谱控制面板</span>
            </span>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-md p-0.5 transition-colors"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>

          {/* Filters */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide block">分类显示过滤</span>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(activeGroups).map(group => {
                const groupLabels: Record<string, string> = {
                  core: "核心架构 (Core)",
                  data: "数据工程 (Data)",
                  storage: "存储引擎 (Storage)",
                  retrieval: "混合检索 (Retrieval)",
                  cognitive: "认知生成 (Cognitive)",
                }
                const colors: Record<string, string> = {
                  core: "bg-[#5E6AD2]",
                  data: "bg-[#FF5630]",
                  storage: "bg-[#36B37E]",
                  retrieval: "bg-[#FFAB00]",
                  cognitive: "bg-[#9F7AEA]",
                }
                return (
                  <label
                    key={group}
                    className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={activeGroups[group]}
                      onChange={() =>
                        setActiveGroups(prev => ({ ...prev, [group]: !prev[group] }))
                      }
                      className="rounded border-border/50 text-primary focus:ring-primary size-3.5 cursor-pointer"
                    />
                    <span className={cn("size-2 rounded-full shrink-0", colors[group])} />
                    <span>{groupLabels[group] || group}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3.5 border-t border-border/30 pt-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-foreground/85">
                <span>排斥引力强度</span>
                <span className="font-mono text-muted-foreground">{repulsionStrength}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="15000"
                step="500"
                value={repulsionStrength}
                onChange={(e) => setRepulsionStrength(Number(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-foreground/85">
                <span>连线弹簧长度</span>
                <span className="font-mono text-muted-foreground">{desiredLinkLength}px</span>
              </div>
              <input
                type="range"
                min="45"
                max="220"
                step="5"
                value={desiredLinkLength}
                onChange={(e) => setDesiredLinkLength(Number(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-foreground/85">
                <span>重力引力系数</span>
                <span className="font-mono text-muted-foreground">{gravityStrength.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.07"
                step="0.002"
                value={gravityStrength}
                onChange={(e) => setGravityStrength(Number(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-foreground/85">
                <span>节点显示缩放</span>
                <span className="font-mono text-muted-foreground">{nodeSizeScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={nodeSizeScale}
                onChange={(e) => setNodeSizeScale(Number(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Display Toggles */}
          <div className="space-y-2 border-t border-border/30 pt-3">
            <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide block">视图呈现</span>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={() => setShowLabels(!showLabels)}
                  className="rounded border-border/50 text-primary size-3.5 cursor-pointer"
                />
                <span>显示实体文本标签</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showConnections}
                  onChange={() => setShowConnections(!showConnections)}
                  className="rounded border-border/50 text-primary size-3.5 cursor-pointer"
                />
                <span>显示关联拓扑连线</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors text-amber-500/90 hover:text-amber-500">
                <input
                  type="checkbox"
                  checked={freezePhysics}
                  onChange={() => setFreezePhysics(!freezePhysics)}
                  className="rounded border-border/50 text-amber-500 focus:ring-amber-500 size-3.5 cursor-pointer"
                />
                <span>冻结物理引擎碰撞</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Pure Fullscreen SVG Canvas Container */}
      <div className="absolute inset-0 w-full h-full z-10">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing bg-transparent"
          xmlns="http://www.w3.org/2000/svg"
          onMouseDown={handleBgMouseDown}
          onMouseMove={handleBgMouseMove}
          onMouseUp={handleBgMouseUpOrLeave}
          onMouseLeave={handleBgMouseUpOrLeave}
        >
          {/* Visual glow filters for nodes and matching highlights */}
          <defs>
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="1" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Transformed zoom/pan container */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            
            {/* Render Links / Edges */}
            {showConnections &&
              links.map((link, idx) => {
                const nodeA = filteredNodes.find(n => n.id === link.source)
                const nodeB = filteredNodes.find(n => n.id === link.target)
                if (!nodeA || !nodeB) return null

                // Hover focusing logic
                let opacity = 0.2
                let strokeColor = "var(--border)"
                let strokeWidth = 1.0
                let isHighlighted = false

                if (hoveredNodeId) {
                  const isNodeA = link.source === hoveredNodeId
                  const isNodeB = link.target === hoveredNodeId
                  if (isNodeA || isNodeB) {
                    opacity = 0.85
                    strokeColor = isNodeA ? nodeA.color : nodeB.color
                    strokeWidth = 2.0
                    isHighlighted = true;
                  } else {
                    opacity = 0.04
                  }
                } else if (searchMatchingIds) {
                  const isNodeAMatch = searchMatchingIds.has(link.source)
                  const isNodeBMatch = searchMatchingIds.has(link.target)
                  if (isNodeAMatch && isNodeBMatch) {
                    opacity = 0.8
                    strokeWidth = 1.6
                    strokeColor = "oklch(0.53 0.19 275)"
                  } else {
                    opacity = 0.05
                  }
                } else {
                  // Standard default paths
                  const isNodeAActive = link.source === activeNodeId
                  const isNodeBActive = link.target === activeNodeId
                  if (isNodeAActive || isNodeBActive) {
                    opacity = 0.55
                    strokeColor = isNodeAActive ? nodeA.color : nodeB.color
                    strokeWidth = 1.6
                  }
                }

                return (
                  <line
                    key={`edge-${idx}`}
                    x1={nodeA.x}
                    y1={nodeA.y}
                    x2={nodeB.x}
                    y2={nodeB.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    className="transition-all duration-200"
                    style={{
                      filter: isHighlighted ? "url(#neon-glow)" : undefined
                    }}
                  />
                )
              })}

            {/* Render Node Groups */}
            {filteredNodes.map((node) => {
              const isSelected = activeNodeId === node.id
              const isHovered = hoveredNodeId === node.id
              const isDirectlyConnected = adjacentNodeIds.has(node.id)

              // Node radius depends on group size/hierarchy
              const isCentralHub = node.id === "rag"
              const baseRadius = isCentralHub ? 26 : 17
              const radius = baseRadius * nodeSizeScale

              // Filter / Highlight opacity calculations
              let opacity = 1
              let isSearchMatched = false

              if (hoveredNodeId) {
                if (!isDirectlyConnected) {
                  opacity = 0.18
                }
              } else if (searchMatchingIds) {
                if (searchMatchingIds.has(node.id)) {
                  opacity = 1
                  isSearchMatched = true
                } else {
                  opacity = 0.15
                }
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Selected outer glowing breathing ring */}
                  {(isSelected || isSearchMatched || isHovered) && (
                    <circle
                      r={radius + 5}
                      fill="transparent"
                      stroke={isSearchMatched ? "oklch(0.53 0.19 275)" : node.color}
                      strokeWidth="2"
                      strokeOpacity={isHovered ? "0.9" : "0.5"}
                      className={cn(
                        "transition-all duration-300",
                        !freezePhysics && "animate-pulse"
                      )}
                      style={{
                        filter: "url(#neon-glow)"
                      }}
                    />
                  )}

                  {/* Node circle background */}
                  <circle
                    r={radius}
                    fill="var(--card)"
                    stroke={isSelected ? node.color : "oklch(0.65 0.01 240 / 0.3)"}
                    strokeWidth={isSelected ? "2.5" : "1.2"}
                    className="transition-all duration-300 shadow-lg"
                    style={{
                      filter: "url(#node-glow)",
                      opacity: opacity,
                    }}
                  />

                  {/* Accent center core dot representing active theme */}
                  <circle
                    r={isCentralHub ? 4.5 : 3}
                    fill={node.color}
                    opacity="0.9"
                    style={{
                      opacity: opacity,
                    }}
                  />

                  {/* Node Name Label below node */}
                  {showLabels && (
                    <text
                      y={radius + 12}
                      textAnchor="middle"
                      className={cn(
                        "text-[9px] select-none font-semibold fill-muted-foreground/90 transition-colors duration-200 pointer-events-none tracking-tight",
                        isSelected && "fill-primary font-bold"
                      )}
                      style={{
                        opacity: opacity,
                      }}
                    >
                      {node.name}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

    </div>
  )
}
