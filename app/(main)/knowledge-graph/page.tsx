"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import {
  SlidersHorizontal,
  Maximize2,
  Play,
  ExternalLink,
  Sparkles,
  Video,
  Tag,
  Settings,
  Clock,
  Layers,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

// Dynamically load react-force-graph-2d with ssr: false since it relies on HTML5 Canvas API
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default || mod),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center bg-background h-full min-h-[500px]">
        <div className="relative flex flex-col items-center gap-8">
          {/* Animated node cloud */}
          <div className="relative w-32 h-32">
            {/* Center node */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 rounded-full bg-primary shadow-[0_0_20px_rgba(94,106,210,0.5)] animate-pulse" />
            {/* Orbiting nodes */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <div
                key={angle}
                className="absolute size-2 rounded-full bg-foreground/25"
                style={{
                  animation: `orbit 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                  animationDelay: `${i * 0.3}s`,
                  top: `${50 - 35 * Math.sin((angle * Math.PI) / 180)}%`,
                  left: `${50 + 35 * Math.cos((angle * Math.PI) / 180)}%`,
                }}
              />
            ))}
            {/* Connection lines */}
            <div className="absolute inset-0 rounded-full border border-foreground/8 animate-[spin_12s_linear_infinite]" />
            <div className="absolute inset-[12%] rounded-full border border-foreground/8 animate-[spin_8s_linear_infinite_reverse]" />
            <div className="absolute inset-[24%] rounded-full border border-primary/10 animate-[spin_6s_linear_infinite]" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-foreground/70 tracking-wide">
              知识图谱引擎加载中
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-1.5 rounded-full bg-primary/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes orbit {
            0%, 100% { transform: scale(0.6); opacity: 0.3; }
            50% { transform: scale(1.4); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }
)

interface VideoData {
  id: string
  title: string | null
  source: string
  url: string | null
  localPath: string | null
  duration: number | null
  thumbnail: string | null
  status: string
  summary: string | null
  mindmap: string | null
  createdAt: string
}

interface GraphNode {
  id: string
  name: string
  val: number // Represents visual size
  color: string
  type: "video" | "concept" | "category"
  source?: string
  videoId?: string
  overview?: string
  keyPoints?: string[]
  duration?: number
  // internal properties populated by force graph engine
  x?: number
  y?: number
  __highlighted?: boolean
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  color?: string
}

export default function KnowledgeGraphPage() {
  const router = useRouter()
  const fgRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const STORAGE_KEY = "kg-v1"

  const loadSaved = () => {
    try {
      if (typeof window === "undefined") return {}
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return {}
  }

  const saveSettings = (partial: Record<string, unknown>) => {
    const current = loadSaved()
    const next = { ...current, ...partial }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const saved = loadSaved()

  // States
  const [videos, setVideos] = useState<VideoData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [zoomScale, setZoomScale] = useState<number>(1.0)

  // Custom View Controls
  const [showLabels, setShowLabels] = useState<boolean>(saved.showLabels ?? true)
  const [showControls, setShowControls] = useState<boolean>(false)

  // Physics Settings
  const [linkDistance, setLinkDistance] = useState<number>(saved.linkDistance ?? 50)
  const [chargeStrength, setChargeStrength] = useState<number>(saved.chargeStrength ?? -100)
  const [centripetalStrength, setCentripetalStrength] = useState<number>(saved.centripetalStrength ?? 0.2)
  const [cooldownTicks, setCooldownTicks] = useState<number>(200)

  // Highlight Sets for reactive interactive graphs
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [highlightedLinks, setHighlightedLinks] = useState<Set<any>>(new Set())

  // Dynamic Theme state
  const [isDark, setIsDark] = useState<boolean>(true)
  const forcesInitialized = useRef(false)

  useEffect(() => {
    // Detect theme class on load
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains("dark")
      setIsDark(dark)
    }
    checkTheme()
    
    // Listen for class updates
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    
    fetchVideos()
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setDimensions({ width, height })
        }
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // One-time d3 force initialization — runs once when graph ref becomes available
  useEffect(() => {
    if (!fgRef.current || forcesInitialized.current) return

    import('d3-force').then(d3Force => {
      const fg = fgRef.current
      if (!fg) return

      fg.d3Force('center', d3Force.forceCenter(0, 0))
      fg.d3Force('charge')?.strength(chargeStrength)
      fg.d3Force('link')?.distance(linkDistance)
      fg.d3Force('radial', d3Force.forceRadial(0, 0, 0).strength(centripetalStrength))
      fg.d3Force('collision', d3Force.forceCollide(12))

      forcesInitialized.current = true
      fg.d3ReheatSimulation()
    })
  })

  // Sync physics params to d3 forces on slider changes
  useEffect(() => {
    if (!fgRef.current || !forcesInitialized.current) return
    const fg = fgRef.current

    import('d3-force').then(d3Force => {
      fg.d3Force('charge')?.strength(chargeStrength)
      fg.d3Force('link')?.distance(linkDistance)
      fg.d3Force('radial', d3Force.forceRadial(0, 0, 0).strength(centripetalStrength))
      fg.d3ReheatSimulation()
    })
  }, [chargeStrength, linkDistance, centripetalStrength])

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/video")
      const data = await res.json()
      setVideos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch videos in graph:", err)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  // Pre-load dummy datasets for gorgeous presentation and merge them with database nodes if they exist
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    const doneVideos = videos.filter(v => v.status === "done")

    // 1. ALWAYS Add Mock Category Nodes (Hubs)
    const categories = [
      { id: "cat-fe", name: "前端框架 & 工程化", color: "oklch(0.53 0.19 275)" }, // primary Indigo
      { id: "cat-ai", name: "人工智能 & 语言模型", color: "oklch(0.60 0.18 140)" }, // beautiful green
      { id: "cat-sys", name: "系统架构 & 网络技术", color: "oklch(0.55 0.18 30)" }, // orange
      { id: "cat-db", name: "数据库 & 存储系统", color: "oklch(0.65 0.20 200)" }, // beautiful cyan
      { id: "cat-devops", name: "云原生 & 容器部署", color: "oklch(0.50 0.22 340)" }, // premium magenta
    ]
    
    categories.forEach(cat => {
      nodes.push({
        id: cat.id,
        name: cat.name,
        val: 18,
        color: cat.color,
        type: "category",
        overview: "核心技术学习体系的大类，聚合所有相关的音视频与概念结点。"
      })
    })

    // 2. ALWAYS Add Mock Video Nodes
    const mockVideos = [
      { id: "v1", title: "React 19 Concurrent Mode 深度剖析", source: "bilibili", cat: "cat-fe", overview: "系统剖析 React 19 并发机制 the 底层原理，涵盖 Fiber 调度的重构变化以及 Transitions API 工作流。" },
      { id: "v2", title: "Next.js 15 Server Actions 全实战演练", source: "youtube", cat: "cat-fe", overview: "Next.js 15 全新特性的生产级别实战，详解 Server Actions 的高阶安全限制以及表单交互状态封装。" },
      { id: "v3", title: "AI Agent 智能体工作流设计模式", source: "youtube", cat: "cat-ai", overview: "全面探讨大语言模型智能体 (Agents) 的常用架构设计，包括 ReAct 反思链、多 Agent 协作系统等主流设计方法。" },
      { id: "v4", title: "Vector Database 与 RAG 原理全维度理解", source: "local", cat: "cat-ai", overview: "详解向量数据库在高维空间中进行近邻检索的数学原理，并结合 RAG (检索增强生成) 分享企业级知识库落地避坑指南。" },
      { id: "v5", title: "高性能 Webpack 转换为 Vite 迁移路线", source: "bilibili", cat: "cat-fe", overview: "全面对比老旧大体量 Webpack 项目迁移到现代化构建工具 Vite 时的热更新效率、包大小以及 Plugin 兼容处理策略。" },
      { id: "v6", title: "Rust 高并发网络编程实战", source: "bilibili", cat: "cat-sys", overview: "基于 Rust 语言与 Tokio 异步运行时，构建超高性能、高吞吐量的网络通信服务，深入讲解非阻塞 I/O 原理。" },
      { id: "v7", title: "PostgreSQL 索引与查询优化深度指南", source: "local", cat: "cat-db", overview: "全面解读 PostgreSQL 查询计划器工作机制，深入剖析 B-Tree 索引、Hash 索引底层原理，指导生产数据库性能调优。" },
      { id: "v8", title: "Kubernetes 编排与 Docker 容器安全实践", source: "youtube", cat: "cat-devops", overview: "生产级 Kubernetes 集群的声明式资源配置与网络编排模型设计，全方位讲解容器沙箱隔离与镜像安全防护。" },
      { id: "v9", title: "Transformer 架构底层数学原理与注意力机制", source: "youtube", cat: "cat-ai", overview: "透彻推导 Transformer 底层架构 of 数学模型，包括 Self-Attention、Multi-Head Attention 机制以及位置编码技术。" },
      { id: "v10", title: "Tailwind CSS 与现代前端排版设计美学", source: "bilibili", cat: "cat-fe", overview: "解析现代原子化 CSS 设计框架 of 布局美学，涵盖 Flexbox/Grid 网格系统、响应式适配与极简高保真界面搭建。" }
    ]

    mockVideos.forEach(v => {
      nodes.push({
        id: v.id,
        name: v.title,
        val: 12,
        color: v.source === "bilibili" ? "#fb7299" : v.source === "youtube" ? "#ff0000" : "#00a2ff",
        type: "video",
        source: v.source,
        overview: v.overview,
        keyPoints: [
          "掌握核心底层运行逻辑与框架渲染更新时序",
          "理解不同场景下技术选型的权衡优势",
          "针对常见性能瓶颈给出切实可用的落地优化路线"
        ]
      })
      
      links.push({
        source: v.cat,
        target: v.id
      })
    })

    // 3. ALWAYS Add Mock Concept Nodes
    const mockConcepts = [
      { id: "c-fiber", name: "React Fiber", cat: "v1" },
      { id: "c-concur", name: "Concurrent Mode", cat: "v1" },
      { id: "c-server-act", name: "Server Actions", cat: "v2" },
      { id: "c-rsc", name: "React Server Component", cat: "v2" },
      { id: "c-react-agent", name: "ReAct 架构", cat: "v3" },
      { id: "c-multi-agent", name: "多智能体协同", cat: "v3" },
      { id: "c-rag", name: "检索增强生成 (RAG)", cat: "v4" },
      { id: "c-ann", name: "ANN 向量索引", cat: "v4" },
      { id: "c-hmr", name: "HMR 热更新机制", cat: "v5" },
      { id: "c-ast", name: "AST 抽象语法树", cat: "v5" },
      { id: "c-tokio", name: "Tokio 异步运行时", cat: "v6" },
      { id: "c-epoll", name: "Linux epoll 机制", cat: "v6" },
      { id: "c-btree", name: "B-Tree 索引", cat: "v7" },
      { id: "c-mvcc", name: "MVCC 多版本并发控制", cat: "v7" },
      { id: "c-k8s", name: "K8s Pod 调度", cat: "v8" },
      { id: "c-docker", name: "Docker 命名空间", cat: "v8" },
      { id: "c-attn", name: "Self-Attention", cat: "v9" },
      { id: "c-qkv", name: "QKV 矩阵变换", cat: "v9" },
      { id: "c-layout", name: "Flexbox & Grid 布局", cat: "v10" },
      { id: "c-design", name: "原子化设计系统", cat: "v10" }
    ]

    mockConcepts.forEach(c => {
      nodes.push({
        id: c.id,
        name: c.name,
        val: 7,
        color: isDark ? "rgba(228, 228, 231, 0.75)" : "rgba(39, 39, 42, 0.75)",
        type: "concept",
        overview: `源自视频中提取的核心学术或技术术语。对于透彻掌握此视频的知识图谱起到关键结点的桥梁作用。`
      })
      
      links.push({
        source: c.cat,
        target: c.id
      })
    })

    // ALWAYS Connect some shared cross-references concepts
    links.push({ source: "c-rsc", target: "v1" })
    links.push({ source: "c-ann", target: "c-rag" })
    links.push({ source: "c-fiber", target: "c-hmr" })
    links.push({ source: "c-tokio", target: "v3" }) // Tokio used in AI Agent workflows
    links.push({ source: "c-btree", target: "c-ann" }) // Vector Index vs Traditional Index
    links.push({ source: "c-attn", target: "c-rag" }) // Self-Attention supports RAG text parsing
    links.push({ source: "c-rsc", target: "v10" }) // RSC links to UI layout styling

    // 4. Optionally Append Database Videos if they exist
    if (doneVideos.length > 0) {
      // Add platform hub categories
      const platforms = [
        { id: "plat-bili", name: "哔哩哔哩视频源", color: "#fb7299" },
        { id: "plat-yt", name: "YouTube 资源库", color: "#ff0000" },
        { id: "plat-local", name: "本地上传视频", color: "#00a2ff" }
      ]

      platforms.forEach(p => {
        nodes.push({
          id: p.id,
          name: p.name,
          val: 18,
          color: p.color,
          type: "category",
          overview: "当前视频库接入的平台数据大类，按视频来源进行全局结点聚合归纳。"
        })
      })

      // Process each video node
      doneVideos.forEach(v => {
        let overview = "智能模型尚未提取完整的概览描述。"
        let keyPoints: string[] = []

        if (v.summary) {
          try {
            const parsed = JSON.parse(v.summary)
            overview = parsed.overview || overview
            keyPoints = parsed.keyPoints || []
          } catch {}
        }

        nodes.push({
          id: v.id,
          name: v.title || "未命名视频",
          val: 12,
          color: v.source === "bilibili" ? "#fb7299" : v.source === "youtube" ? "#ff0000" : "#00a2ff",
          type: "video",
          source: v.source,
          videoId: v.id,
          overview,
          keyPoints,
          duration: v.duration || undefined
        })

        // Link to platform source category
        const targetPlat = v.source === "bilibili" ? "plat-bili" : v.source === "youtube" ? "plat-yt" : "plat-local"
        links.push({
          source: targetPlat,
          target: v.id
        })

        // Process Keypoints as dynamic Concept Nodes
        keyPoints.forEach((kp, idx) => {
          // Extract 3-8 key words from long sentences
          let keyword = kp.slice(0, 12)
          if (kp.includes("：")) keyword = kp.split("：")[0]
          else if (kp.includes(":")) keyword = kp.split(":")[0]
          else if (kp.length > 15) {
            // Just take a cleaner visual phrase
            const words = ["React", "Vue", "Next.js", "AI", "模型", "提示词", "性能", "渲染", "并发", "调度", "数据库", "架构", "编译", "热更新", "网络", "内存"]
            const found = words.find(w => kp.toLowerCase().includes(w.toLowerCase()))
            if (found) keyword = found + "相关概念"
          }

          const conceptId = `c-${v.id}-${idx}`
          
          // Push concept node
          nodes.push({
            id: conceptId,
            name: keyword,
            val: 7,
            color: isDark ? "rgba(228, 228, 231, 0.75)" : "rgba(39, 39, 42, 0.75)",
            type: "concept",
            overview: kp
          })

          // Link concept to its parent video
          links.push({
            source: v.id,
            target: conceptId
          })
        })
      })
    }

    // 5. Add 100 test concept nodes for layout stress-testing
    const testPrefixes = ["量子", "神经", "分布式", "并行", "语义", "向量", "递归", "对抗", "生成", "优化",
      "图", "流", "微", "元", "超", "多模态", "自监督", "强化", "知识", "时序",
      "加密", "联邦", "边缘", "协同", "自适应", "异构", "因果", "扩散", "稀疏", "稠密"]
    const testSuffixes = ["网络", "引擎", "协议", "模型", "算法", "框架", "架构", "算子", "策略", "系统",
      "编码器", "解码器", "索引", "缓存", "调度", "路由", "推理", "训练", "集群", "存储"]

    const testCount = 100
    const allSourceIds = nodes.map(n => n.id)

    // Create 3 super-hub nodes with 25+ connections each
    const hubs = [
      { id: "hub-ai", name: "AI 全景枢纽", color: "oklch(0.55 0.22 340)" },
      { id: "hub-infra", name: "基础设施中枢", color: "oklch(0.55 0.18 30)" },
      { id: "hub-arch", name: "架构设计中心", color: "oklch(0.65 0.20 200)" }
    ]
    hubs.forEach(hub => {
      nodes.push({ id: hub.id, name: hub.name, val: 8, color: hub.color, type: "concept", overview: "高连接度枢纽测试节点" })
    })

    for (let i = 0; i < testCount; i++) {
      const prefix = testPrefixes[i % testPrefixes.length]
      const suffix = testSuffixes[Math.floor(i / testPrefixes.length) % testSuffixes.length]
      const testId = `test-${i}`
      nodes.push({
        id: testId,
        name: `${prefix}${suffix} #${i + 1}`,
        val: 3,
        color: isDark ? "rgba(180, 180, 190, 0.7)" : "rgba(100, 100, 110, 0.7)",
        type: "concept",
        overview: `测试节点 ${i + 1}：用于验证力导向布局在高密度场景下的表现。`
      })
    }

    // Hub nodes each connect to 25+ test nodes + some existing nodes
    hubs.forEach(hub => {
      // Connect to 6 existing nodes
      const existingTargets = allSourceIds.slice(0, 6)
      existingTargets.forEach(t => links.push({ source: hub.id, target: t }))
      // Connect to 25 test nodes
      for (let i = 0; i < 25; i++) {
        links.push({ source: hub.id, target: `test-${i * 4 + (hubs.indexOf(hub))}` })
      }
    })

    // 6. Star cluster: 1 parent → 20 leaf nodes (leaves only connect to parent)
    nodes.push({
      id: "star-hub", name: "中心母节点 (星型拓扑)", val: 8, color: "oklch(0.53 0.19 275)", type: "concept",
      overview: "星型拓扑中心枢纽，连接 20 个仅与其相连的叶子节点。"
    })
    for (let i = 0; i < 20; i++) {
      const leafId = `star-leaf-${i}`
      nodes.push({
        id: leafId, name: `叶子节点 ${i + 1}`, val: 2,
        color: isDark ? "rgba(180, 180, 190, 0.7)" : "rgba(100, 100, 110, 0.7)",
        type: "concept",
        overview: "星型拓扑叶子节点，仅与中心母节点相连。"
      })
      links.push({ source: "star-hub", target: leafId })
    }

    // Remaining test nodes: connect each to 1-2 random nodes
    const allIds = nodes.map(n => n.id)
    for (let i = 0; i < testCount; i++) {
      const testId = `test-${i}`
      const linkCount = 1 + Math.floor(Math.random() * 2)
      const connected = new Set<string>()
      for (let j = 0; j < linkCount; j++) {
        const target = allIds[Math.floor(Math.random() * allIds.length)]
        if (target !== testId && !connected.has(target)) {
          connected.add(target)
          links.push({ source: testId, target })
        }
      }
    }

    // Apply saved positions from previous session
    if (saved.positions) {
      nodes.forEach(n => {
        const pos = saved.positions[n.id]
        if (pos) { n.x = pos.x; n.y = pos.y }
      })
    }

    return { nodes, links }
  }, [videos, isDark])

  // Custom Paint function for nodes (Canvas rendering)
  const nodePaint = (
    node: GraphNode,
    color: string,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
    drawLabels: boolean
  ) => {
    const { x, y, id, name } = node
    if (x === undefined || y === undefined) return

    // Highlight states
    const isHovered = hoveredNode?.id === id
    const isSelected = selectedNode?.id === id
    const isNeighbor = highlightedNodes.has(id)

    const conns = rawConnMap.get(id) || 0
    const ratio = rawMaxConn > 1 ? Math.sqrt(conns) / Math.sqrt(rawMaxConn) : 0.5
    const size = 2.5 + ratio * 5

    ctx.save()
    ctx.fillStyle = color

    // Draw circle
    ctx.beginPath()
    ctx.arc(x, y, size, 0, 2 * Math.PI, false)
    ctx.fill()

    if (drawLabels && (isHovered || isSelected || isNeighbor)) {
      ctx.strokeStyle = isSelected ? "oklch(0.53 0.19 275)" : "rgba(94, 106, 210, 0.45)"
      ctx.lineWidth = isSelected ? 2.5 / globalScale : 1.5 / globalScale
      ctx.stroke()
    }

    ctx.restore()

    // Draw Labels (Only for Screen rendering `nodeCanvasObject`, skipped in `nodePointerAreaPaint` hit-testing)
    // Zoom/scale threshold logic: calculate dynamic label alpha based on zoom globalScale for smooth fade-in!
    let labelAlpha = 1.0
    if (!isHovered && !isSelected) {
      if (globalScale < 2.0) {
        labelAlpha = 0.0
      } else if (globalScale < 3.0) {
        labelAlpha = (globalScale - 2.0) / (3.0 - 2.0)
      }
    }

    const shouldDrawLabel = drawLabels && (showLabels || isHovered || isSelected) && labelAlpha > 0.0
    
    if (shouldDrawLabel) {
      const fontSize = Math.max(10 / globalScale, 2.5)
      ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`
      
      const labelText = name.length > 18 ? name.slice(0, 16) + "..." : name
      const textOffset = size + 5

      ctx.save()

      // Obsidian style: Centered clean text below circle with shadow glow
      ctx.shadowColor = isDark ? `rgba(0, 0, 0, ${0.9 * labelAlpha})` : `rgba(255, 255, 255, ${0.9 * labelAlpha})`
      ctx.shadowBlur = 4 / globalScale

      ctx.fillStyle = isDark ? `rgba(200, 200, 200, ${0.9 * labelAlpha})` : `rgba(70, 70, 70, ${0.9 * labelAlpha})`
      if (isSelected) {
        ctx.fillStyle = `rgba(94, 106, 210, ${labelAlpha})`
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`
      } else if (isHovered || isNeighbor) {
        ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${labelAlpha})` : `rgba(17, 17, 17, ${labelAlpha})`
      }

      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillText(labelText, x, y + textOffset)
      
      ctx.restore()
    }
  }

  // Interactive Hovering Logic
  const handleNodeHover = (node: any) => {
    setHoveredNode(node)
    
    // Clear highlights
    const nodes = new Set<string>()
    const links = new Set<any>()

    if (node) {
      nodes.add(node.id)
      
      // Highlight adjacent links and neighbors
      graphData.links.forEach((l: any) => {
        const sourceId = typeof l.source === "object" ? l.source.id : l.source
        const targetId = typeof l.target === "object" ? l.target.id : l.target
        
        if (sourceId === node.id) {
          links.add(l)
          nodes.add(targetId)
        } else if (targetId === node.id) {
          links.add(l)
          nodes.add(sourceId)
        }
      })
    }
    
    setHighlightedNodes(nodes)
    setHighlightedLinks(links)
  }

  // Center on node and focus camera
  const focusOnNode = (node: GraphNode) => {
    setSelectedNode(node)
    
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      // Zoom and center camera at selected coordinates
      fgRef.current.centerAt(node.x, node.y, 1000)
      fgRef.current.zoom(3.5, 1000)
    }
  }

  const resetZoom = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(1000, 80)
    }
  }

  // Pre-calculate node types map for O(1) lookups
  const nodeTypeMap = useMemo(() => {
    const map = new Map<string, "video" | "concept" | "category">()
    graphData.nodes.forEach(node => {
      map.set(node.id, node.type)
    })
    return map
  }, [graphData.nodes])

  // Raw connection count (no boost) — used for node sizing
  const rawConnMap = useMemo(() => {
    const map = new Map<string, number>()
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source
      const targetId = typeof link.target === "object" ? link.target.id : link.target
      if (sourceId) map.set(sourceId, (map.get(sourceId) || 0) + 1)
      if (targetId) map.set(targetId, (map.get(targetId) || 0) + 1)
    })
    return map
  }, [graphData.links])

  const rawMaxConn = useMemo(() => {
    let max = 1
    rawConnMap.forEach(c => { if (c > max) max = c })
    return max
  }, [rawConnMap])

  // Calculate degree (connection count + hierarchical type weight) for color mapping
  const degreeMap = useMemo(() => {
    const map = new Map(rawConnMap)
    map.forEach((count, id) => {
      const type = nodeTypeMap.get(id) || "concept"
      let boost = 0
      if (type === "category") boost = 20
      else if (type === "video") boost = 8
      map.set(id, count + boost)
    })
    return map
  }, [rawConnMap, nodeTypeMap])

  const maxDegree = useMemo(() => {
    let max = 1
    degreeMap.forEach(count => {
      if (count > max) max = count
    })
    return max
  }, [degreeMap])

  const getNodeBaseColor = (nodeId: string) => {
    const deg = degreeMap.get(nodeId) || 0
    
    // Safety check: if isolated node or only 1 connection, return base light grey immediately
    if (deg <= 1 || maxDegree <= 1) {
      return isDark ? "rgb(200, 200, 205)" : "rgb(212, 212, 216)" // Beautiful light grey in both dark and light modes
    }

    // Safely calculate ratio since deg >= 2 and maxDegree >= 2
    const ratio = Math.sqrt(deg - 1) / Math.sqrt(maxDegree - 1)
    const boundedRatio = Math.max(0, Math.min(1, isNaN(ratio) ? 0 : ratio))

    if (isDark) {
      // In dark mode: unlinked/single nodes default to light grey (rgb(200, 200, 205)), highly connected nodes are soft medium grey (rgb(110, 110, 115))
      const r = Math.round(200 - (200 - 110) * boundedRatio)
      const g = Math.round(200 - (200 - 110) * boundedRatio)
      const b = Math.round(205 - (205 - 115) * boundedRatio)
      return `rgb(${r}, ${g}, ${b})`
    } else {
      // In light mode: unlinked/single nodes default to light grey (rgb(212, 212, 216)), highly connected nodes are soft medium grey (rgb(110, 110, 115))
      const r = Math.round(212 - (212 - 110) * boundedRatio)
      const g = Math.round(212 - (212 - 110) * boundedRatio)
      const b = Math.round(216 - (216 - 115) * boundedRatio)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row relative min-h-0 bg-background overflow-hidden">
      


      {/* Floating control buttons */}
      <div className="absolute right-4 top-4 z-20 flex gap-2 select-none">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetZoom}
          className="h-9 w-9 p-0 bg-background/70 backdrop-blur-md border-border/70 hover:bg-muted/80 shadow-md"
          title="重置视图"
        >
          <Maximize2 className="size-3.5" />
        </Button>
        <Button 
          variant={showControls ? "default" : "outline"} 
          size="sm" 
          onClick={() => setShowControls(!showControls)}
          className="h-9 w-9 p-0 bg-background/70 backdrop-blur-md border-border/70 hover:bg-muted/80 shadow-md"
          title="物理与显示控制"
        >
          <Settings className="size-3.5" />
        </Button>
      </div>

      {/* Main Graph Area */}
      <div ref={containerRef} className="flex-1 h-full min-h-[400px] relative overflow-hidden bg-background">
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeRelSize={6}
          nodeLabel={() => ""}
          linkLabel={() => ""}
          // Dynamic Dynamic Custom Canvas Rendering
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isSel = selectedNode?.id === node.id
            const isHov = hoveredNode?.id === node.id
            const isNeigh = highlightedNodes.has(node.id)

            const baseGrey = getNodeBaseColor(node.id)
            let color = baseGrey

            if (highlightedNodes.size > 0) {
              if (isSel) {
                color = "oklch(0.53 0.19 275)"
              } else if (isHov) {
                color = "oklch(0.60 0.18 275)"
              } else if (isNeigh) {
                color = baseGrey
              } else {
                color = isDark ? "rgba(63, 63, 70, 0.15)" : "rgba(228, 228, 231, 0.25)"
              }
            } else {
              if (isSel) {
                color = "oklch(0.53 0.19 275)"
              }
            }

            nodePaint(node, color, ctx, globalScale, true)
          }}
          // Dynamic pointer hit-testing area (matching drawing exactly!)
          nodePointerAreaPaint={(node: any, color, ctx) => {
            nodePaint(node, color, ctx, 1, false)
          }}
          nodeCanvasObjectMode={() => "replace"}
          
          // Link properties
          linkWidth={link => {
            const isHl = highlightedLinks.has(link)
            return isHl ? 1.5 : 0.75
          }}
          linkColor={link => {
            const isHl = highlightedLinks.has(link)
            if (highlightedNodes.size > 0 && !isHl) {
              return isDark ? "rgba(63, 63, 70, 0.05)" : "rgba(228, 228, 231, 0.12)"
            }
            return isHl
              ? "rgba(94, 106, 210, 0.75)"
              : (isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(9, 9, 11, 0.14)")
          }}
          
          // Interactive particles
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={link => (highlightedLinks.has(link) ? 2.2 : 0.8)}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleColor={link => highlightedLinks.has(link) ? "rgba(94, 106, 210, 0.65)" : "rgba(100, 116, 139, 0.15)"}

          // Physics setup — high damping for compact Obsidian-style circular clustering
          d3VelocityDecay={0.55}
          d3AlphaDecay={0.035}
          warmupTicks={80}
          onNodeClick={(node: any) => focusOnNode(node)}
          onNodeHover={handleNodeHover}
          onBackgroundClick={() => setSelectedNode(null)}
          cooldownTicks={cooldownTicks}
          onEngineStop={() => {
            const fg = fgRef.current
            if (!fg) return
            const positions: Record<string, { x: number; y: number }> = {}
            graphData.nodes.forEach(n => {
              if (n.x !== undefined && n.y !== undefined) {
                positions[n.id] = { x: Math.round(n.x * 100) / 100, y: Math.round(n.y * 100) / 100 }
              }
            })
            saveSettings({ positions })
          }}
          onZoom={({ k }) => {
            requestAnimationFrame(() => setZoomScale(k))
          }}
        />

        {/* Dynamic Scale Debug HUD capsule */}
        <div className="absolute right-4 bottom-4 z-10 bg-background/70 backdrop-blur-md border border-border/60 rounded-full px-4 py-1.5 shadow-md select-none flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 font-mono text-[10px] h-9">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60 uppercase font-bold tracking-wider">Zoom:</span>
            <span className="text-primary font-bold text-[11px] tabular-nums">
              {zoomScale.toFixed(2)}x
            </span>
          </div>
          <div className="h-3.5 w-px bg-border/50" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60 uppercase font-bold tracking-wider">Text Alpha:</span>
            <span className="text-foreground font-bold tabular-nums">
              {(() => {
                if (zoomScale < 2.0) return "0%"
                if (zoomScale >= 3.0) return "100%"
                return `${Math.round(((zoomScale - 2.0) / (3.0 - 2.0)) * 100)}%`
              })()}
            </span>
          </div>
        </div>


      </div>

      {/* Floating control Drawer (Top-Right under trigger) */}
      {showControls && (
        <div className="absolute right-4 top-15 z-20 w-80 bg-background/95 backdrop-blur-md border border-border/70 rounded-xl shadow-xl select-none animate-in fade-in slide-in-from-top-2 duration-300">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3.5 text-primary" />
                  控制台参数调整
                </CardTitle>
                <button 
                  onClick={() => setShowControls(false)}
                  className="text-muted-foreground/60 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <CardDescription className="text-[10px] text-muted-foreground/60 leading-tight">
                微调图谱呈现方式以及底层重力物理参数模型。
              </CardDescription>
            </CardHeader>
            <Separator className="bg-border/45" />
            <CardContent className="p-4 space-y-4">

              {/* Labels Toggle */}
              <div className="flex items-center justify-between bg-muted/20 p-2 rounded-lg border border-border/30">
                <span className="text-[11px] font-medium text-foreground/85">常态显示节点标签文字</span>
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                    showLabels ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <div className={`size-4 rounded-full bg-white transition-transform ${
                    showLabels ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-3.5 pt-1.5 border-t border-border/40">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                    <span>连线引力距离</span>
                    <span className="font-mono text-foreground/90 font-bold">{linkDistance}px</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="150"
                    value={linkDistance}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setLinkDistance(val)
                      saveSettings({ linkDistance: val })
                      if (fgRef.current) {
                        fgRef.current.d3Force("link").distance(val)
                        fgRef.current.d3ReheatSimulation()
                      }
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                    <span>节点电荷排斥力</span>
                    <span className="font-mono text-foreground/90 font-bold">{chargeStrength}</span>
                  </div>
                  <input
                    type="range"
                    min="-200"
                    max="0"
                    value={chargeStrength}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setChargeStrength(val)
                      saveSettings({ chargeStrength: val })
                      if (fgRef.current) {
                        fgRef.current.d3Force("charge").strength(val)
                        fgRef.current.d3ReheatSimulation()
                      }
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                    <span>中心向心力</span>
                    <span className="font-mono text-foreground/90 font-bold">{centripetalStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={Math.round(centripetalStrength * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) / 100
                      setCentripetalStrength(val)
                      saveSettings({ centripetalStrength: val })
                      if (fgRef.current) {
                        const radial = fgRef.current.d3Force("radial")
                        if (radial) {
                          radial.strength(val)
                          fgRef.current.d3ReheatSimulation()
                        }
                      }
                    }}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
              </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Info Inspector Drawer (Right Sidebar) */}
      {selectedNode && (
        <div className="w-full md:w-88 border-t md:border-t-0 md:border-l border-border/45 bg-card/65 backdrop-blur-md flex flex-col shrink-0 h-[380px] md:h-full relative overflow-y-auto custom-scrollbar select-none animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 border-b border-border/30 flex items-start justify-between shrink-0 bg-background/50">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-1.5 select-none">
                {selectedNode.type === "video" ? (
                  <Video className="size-3.5 text-indigo-500" />
                ) : selectedNode.type === "category" ? (
                  <Layers className="size-3.5 text-emerald-500" />
                ) : (
                  <Tag className="size-3.5 text-zinc-500" />
                )}
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block font-mono">
                  {selectedNode.type === "video" ? "视频实体" : selectedNode.type === "category" ? "类别枢纽" : "核心要点"}
                </span>
              </div>
              <h3 className="font-bold text-sm text-foreground/90 leading-snug">
                {selectedNode.name}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground/60 hover:text-foreground shrink-0 mt-0.5"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Inspector Body Details */}
          <div className="flex-1 p-5 space-y-6 overflow-y-auto scrollbar-hide">
            
            {/* Platform / Basic Details */}
            {selectedNode.type === "video" && (
              <div className="grid grid-cols-2 gap-3 bg-muted/20 border border-border/30 p-3 rounded-xl select-none">
                <div>
                  <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider block">视频来源</span>
                  <span className="text-xs font-semibold text-foreground/80 mt-0.5 capitalize flex items-center gap-1">
                    <ExternalLink className="size-3" />
                    {selectedNode.source || "本地加载"}
                  </span>
                </div>
                {selectedNode.duration !== undefined && (
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider block">视频时长</span>
                    <span className="text-xs font-semibold text-foreground/80 mt-0.5 flex items-center gap-1">
                      <Clock className="size-3" />
                      {Math.floor(selectedNode.duration / 60)} 分 {(selectedNode.duration % 60)} 秒
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Overview / Abstract */}
            {selectedNode.overview && (
              <div className="space-y-2">
                <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/65">
                  内容大纲描述
                </h4>
                <div className="rounded-xl border border-border/40 bg-background/40 p-4 leading-[1.65]">
                  <p className="text-[12px] text-foreground/75 font-medium leading-relaxed">
                    {selectedNode.overview}
                  </p>
                </div>
              </div>
            )}

            {/* Keypoints list */}
            {selectedNode.keyPoints && selectedNode.keyPoints.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/65">
                  深度提炼要点
                </h4>
                <div className="space-y-2">
                  {selectedNode.keyPoints.map((kp, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-muted/10 border border-border/20 p-2.5 rounded-lg">
                      <span className="flex-shrink-0 size-4.5 rounded bg-muted border border-border/30 text-[9.5px] font-bold font-mono text-muted-foreground flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-[11.5px] text-foreground/70 leading-relaxed font-medium">
                        {kp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Category hubs additional text */}
            {selectedNode.type === "category" && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                  <div className="flex gap-2.5 items-start">
                    <Sparkles className="size-4.5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-primary">AI 知识网织网计划</h4>
                      <p className="text-[10.5px] text-muted-foreground/80 leading-relaxed">
                        图谱已自动将核心框架的脉络聚合至此结点。您可以通过顶端搜索定位，或继续导入新的音视频来扩张您的个人知识边界。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Quick workspace redirection button (Only for Videos in Database) */}
          {selectedNode.type === "video" && selectedNode.videoId && (
            <div className="p-4 border-t border-border/35 shrink-0 bg-background/50">
              <Button 
                onClick={() => router.push(`/videos/${selectedNode.videoId}`)}
                className="w-full h-9.5 text-xs font-semibold select-none flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Play className="size-3.5 fill-current" />
                进入交互式学习空间
              </Button>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
