export interface MindmapNode {
  [key: string]: unknown
  id: string
  label: string
  summary?: string
  timestamp?: number
  kind?: "root" | "branch" | "leaf" | string
  color?: string
}

export interface MindmapEdge {
  id: string
  source: string
  target: string
}

export interface MindmapModel {
  version: number
  title: string
  nodes: MindmapNode[]
  edges: MindmapEdge[]
}

export function createMindmapModel(value: unknown, fallbackTitle?: string): MindmapModel
export function layoutMindmap(modelInput: unknown): {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: MindmapNode
    width: number
    height: number
  }>
  edges: Array<MindmapEdge & { type: string; animated: boolean }>
}
export function exportMindmapToMarkdown(modelInput: unknown): string
export function exportMindmapToObsidianCanvas(modelInput: unknown): {
  nodes: Array<{
    id: string
    type: "text"
    text: string
    x: number
    y: number
    width: number
    height: number
    color?: string
  }>
  edges: Array<{
    id: string
    fromNode: string
    fromSide: "right"
    toNode: string
    toSide: "left"
  }>
}
export function formatTimestamp(seconds: number): string
