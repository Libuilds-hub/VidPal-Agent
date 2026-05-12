"use client"

import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import "@excalidraw/excalidraw/index.css"

const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#fafafa]">
      <div className="text-muted-foreground">加载中...</div>
    </div>
  ),
})

const INITIAL_ELEMENTS = [
  {
    id: "root",
    type: "rectangle",
    x: 300,
    y: 200,
    width: 180,
    height: 60,
    strokeColor: "#1c1c1c",
    backgroundColor: "#fafafa",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 2, value: 12 },
    text: "视频主题",
  },
  {
    id: "background",
    type: "rectangle",
    x: 560,
    y: 80,
    width: 160,
    height: 50,
    strokeColor: "#1c1c1c",
    backgroundColor: "#e8f4fc",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 2, value: 10 },
    text: "背景与现状",
  },
  {
    id: "concepts",
    type: "rectangle",
    x: 560,
    y: 170,
    width: 160,
    height: 50,
    strokeColor: "#1c1c1c",
    backgroundColor: "#fef3c7",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 2, value: 10 },
    text: "关键概念",
  },
  {
    id: "cases",
    type: "rectangle",
    x: 560,
    y: 260,
    width: 160,
    height: 50,
    strokeColor: "#1c1c1c",
    backgroundColor: "#dcfce7",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 2, value: 10 },
    text: "案例分析",
  },
  {
    id: "methods",
    type: "rectangle",
    x: 560,
    y: 350,
    width: 160,
    height: 50,
    strokeColor: "#1c1c1c",
    backgroundColor: "#f3e8ff",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 2, value: 10 },
    text: "方法与技巧",
  },
  {
    id: "history",
    type: "rectangle",
    x: 800,
    y: 40,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#e8f4fc",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "历史背景",
  },
  {
    id: "current-state",
    type: "rectangle",
    x: 800,
    y: 100,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#e8f4fc",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "当前状态",
  },
  {
    id: "definition",
    type: "rectangle",
    x: 800,
    y: 130,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#fef3c7",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "核心定义",
  },
  {
    id: "principles",
    type: "rectangle",
    x: 800,
    y: 190,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#fef3c7",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "基本原理",
  },
  {
    id: "case1",
    type: "rectangle",
    x: 800,
    y: 220,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#dcfce7",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "案例一",
  },
  {
    id: "case2",
    type: "rectangle",
    x: 800,
    y: 280,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#dcfce7",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "案例二",
  },
  {
    id: "tip1",
    type: "rectangle",
    x: 800,
    y: 310,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#f3e8ff",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "技巧一",
  },
  {
    id: "tip2",
    type: "rectangle",
    x: 800,
    y: 370,
    width: 120,
    height: 40,
    strokeColor: "#1c1c1c",
    backgroundColor: "#f3e8ff",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 2, value: 8 },
    text: "技巧二",
  },
  {
    id: "edge-root-background",
    type: "arrow",
    x: 480,
    y: 220,
    width: 80,
    height: 40,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, -40]],
    startBinding: { elementId: "root", focus: 0.5, gap: 1 },
    endBinding: { elementId: "background", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-root-concepts",
    type: "arrow",
    x: 480,
    y: 230,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "root", focus: 0.5, gap: 1 },
    endBinding: { elementId: "concepts", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-root-cases",
    type: "arrow",
    x: 480,
    y: 260,
    width: 80,
    height: 40,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 40]],
    startBinding: { elementId: "root", focus: 0.5, gap: 1 },
    endBinding: { elementId: "cases", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-root-methods",
    type: "arrow",
    x: 480,
    y: 290,
    width: 80,
    height: 80,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 80]],
    startBinding: { elementId: "root", focus: 0.5, gap: 1 },
    endBinding: { elementId: "methods", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-bg-history",
    type: "arrow",
    x: 720,
    y: 90,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "background", focus: 0.5, gap: 1 },
    endBinding: { elementId: "history", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-bg-current",
    type: "arrow",
    x: 720,
    y: 110,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "background", focus: 0.5, gap: 1 },
    endBinding: { elementId: "current-state", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-concepts-definition",
    type: "arrow",
    x: 720,
    y: 185,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "concepts", focus: 0.5, gap: 1 },
    endBinding: { elementId: "definition", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-concepts-principles",
    type: "arrow",
    x: 720,
    y: 205,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "concepts", focus: 0.5, gap: 1 },
    endBinding: { elementId: "principles", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-cases-case1",
    type: "arrow",
    x: 720,
    y: 275,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "cases", focus: 0.5, gap: 1 },
    endBinding: { elementId: "case1", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-cases-case2",
    type: "arrow",
    x: 720,
    y: 295,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "cases", focus: 0.5, gap: 1 },
    endBinding: { elementId: "case2", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-methods-tip1",
    type: "arrow",
    x: 720,
    y: 365,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "methods", focus: 0.5, gap: 1 },
    endBinding: { elementId: "tip1", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
  {
    id: "edge-methods-tip2",
    type: "arrow",
    x: 720,
    y: 385,
    width: 80,
    height: 0,
    strokeColor: "#9ca3af",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    roundness: { type: 0, value: 0 },
    text: "",
    points: [[0, 0], [80, 0]],
    startBinding: { elementId: "methods", focus: 0.5, gap: 1 },
    endBinding: { elementId: "tip2", focus: 0.5, gap: 1 },
    endArrowhead: "arrow",
  },
]

const EXCALIDRAW_OVERRIDES_CSS = `
  .excalidraw-mindmap .excalidraw .App-bottom-bar {
    left: auto !important;
    right: 0 !important;
    width: auto !important;
    align-items: flex-start !important;
    padding-top: calc(5rem - var(--editor-container-padding, 1rem)) !important;
    padding-right: 0 !important;
    padding-bottom: 0 !important;
    padding-left: 0 !important;
    pointer-events: none !important;
  }

  .excalidraw-mindmap .excalidraw .App-bottom-bar > .Island {
    width: auto !important;
    min-width: auto !important;
    max-width: none !important;
    border-radius: 0 !important;
    border-top-left-radius: var(--border-radius-lg, 8px) !important;
    border-bottom-left-radius: var(--border-radius-lg, 8px) !important;
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    border-right: 0 !important;
    border-left: 1px solid var(--sidebar-border-color, #e9ecef) !important;
    border-top: 1px solid var(--sidebar-border-color, #e9ecef) !important;
    border-bottom: 1px solid var(--sidebar-border-color, #e9ecef) !important;
    pointer-events: auto !important;
    box-shadow: none !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar {
    width: auto !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar-content {
    flex-direction: column !important;
    padding: 4px !important;
    gap: 0 !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar-content .dropdown-menu-button {
    position: relative !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar-content .ToolIcon,
  .excalidraw-mindmap .excalidraw .App-toolbar-content button {
    width: 2rem !important;
    height: 2rem !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar-content .ToolIcon__icon {
    width: 2rem !important;
    height: 2rem !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar__divider {
    display: none !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar-content > div {
    display: flex !important;
    flex-direction: column !important;
  }

  .excalidraw-mindmap .excalidraw .mobile-misc-tools-container {
    display: none !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu-button .dropdown-menu {
    left: auto !important;
    right: 100% !important;
    top: 0 !important;
    margin-top: 0 !important;
    margin-right: 0.375rem !important;
    min-width: max-content !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu-button .dropdown-menu .dropdown-menu-container {
    max-height: 50vh !important;
  }

  .excalidraw-mindmap .excalidraw .main-menu-trigger + .dropdown-menu,
  .excalidraw-mindmap .excalidraw .main-menu-trigger.dropdown-menu-button--mobile + .dropdown-menu,
  .excalidraw-mindmap .excalidraw .main-menu-trigger.dropdown-menu-button--mobile > .dropdown-menu {
    left: auto !important;
    right: 100% !important;
    width: auto !important;
    min-width: 15rem !important;
    max-height: 50vh !important;
    top: 0 !important;
    bottom: auto !important;
  }

  .excalidraw-mindmap .excalidraw .main-menu-trigger + .dropdown-menu.dropdown-menu--mobile,
  .excalidraw-mindmap .excalidraw .main-menu-trigger.dropdown-menu-button--mobile + .dropdown-menu.dropdown-menu--mobile,
  .excalidraw-mindmap .excalidraw .main-menu-trigger.dropdown-menu-button--mobile > .dropdown-menu.dropdown-menu--mobile {
    min-width: 15rem !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu--mobile {
    left: auto !important;
    right: 100% !important;
    width: auto !important;
    min-width: 16rem !important;
    max-height: 50vh !important;
    top: 0 !important;
    bottom: auto !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu--mobile .dropdown-menu-container {
    max-height: 50vh !important;
  }

  .excalidraw-mindmap .excalidraw .Island .dropdown-menu {
    left: auto !important;
    right: 100% !important;
    top: 0 !important;
    margin-top: 0 !important;
    margin-right: 0.375rem !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu .dropdown-menu-item {
    padding: 0.25rem 0.5rem !important;
    min-height: auto !important;
    font-size: 0.75rem !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu .dropdown-menu-item-base {
    font-size: 0.75rem !important;
    column-gap: 0.5rem !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu .dropdown-menu-item__text {
    overflow: visible !important;
    text-overflow: unset !important;
    white-space: nowrap !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu .dropdown-menu-item__shortcut {
    font-size: 0.625rem !important;
  }

  .excalidraw-mindmap .excalidraw .App-bottom-bar > .Island {
    overflow: visible !important;
  }

  .excalidraw-mindmap .excalidraw .App-mobile-menu {
    position: relative !important;
    width: 0 !important;
    height: 0 !important;
    min-height: 0 !important;
    margin-bottom: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .excalidraw-mindmap .excalidraw .App-bottom-bar > .Island .panelColumn {
    position: absolute !important;
    right: 100% !important;
    top: 0 !important;
    width: max-content !important;
    min-width: 200px !important;
    max-height: 50vh !important;
    overflow-y: auto !important;
    padding: 8px !important;
    margin-right: 2px !important;
    background: var(--island-bg-color) !important;
    box-shadow: var(--shadow-island) !important;
    border-radius: var(--border-radius-lg) !important;
  }

  .excalidraw-mindmap .excalidraw .panelColumn .color-picker-container {
    min-width: 200px !important;
  }

  .excalidraw-mindmap .excalidraw .panelColumn .popover {
    position: absolute !important;
    right: 100% !important;
    left: auto !important;
    top: -12px !important;
  }

  .excalidraw-mindmap .excalidraw .panelColumn .color-picker {
    left: auto !important;
    right: 0 !important;
  }

  .excalidraw-mindmap .excalidraw .panelColumn .color-picker-popover-container {
    margin-left: 0 !important;
    margin-right: 0.5rem !important;
  }

  .excalidraw-mindmap .excalidraw .panelColumn .color-picker-triangle {
    left: auto !important;
    right: -14px !important;
    transform: rotate(90deg) !important;
  }

  .excalidraw-mindmap .excalidraw .panelColumn .color-picker-triangle-shadow {
    left: auto !important;
    right: -16px !important;
  }

  .excalidraw-mindmap .excalidraw .panelColumn .dropdown-menu {
    left: auto !important;
    right: 100% !important;
    top: 0 !important;
    margin-top: 0 !important;
    margin-right: 0.375rem !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar__extra-tools-trigger,
  .excalidraw-mindmap .excalidraw .App-toolbar-content .dropdown-menu-button {
    position: relative !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar__extra-tools-trigger + .dropdown-menu {
    left: 0 !important;
    right: auto !important;
    top: 100% !important;
    bottom: auto !important;
    margin-top: 0.375rem !important;
    margin-right: 0 !important;
    min-width: max-content !important;
    max-height: 50vh !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar-content .dropdown-menu-button + .dropdown-menu {
    left: auto !important;
    right: 100% !important;
    top: 0 !important;
    bottom: auto !important;
    margin-top: 0 !important;
    margin-right: 0.375rem !important;
    min-width: max-content !important;
    max-height: 50vh !important;
  }

  .excalidraw-mindmap .excalidraw .App-toolbar__extra-tools-trigger.dropdown-menu-button--mobile + .dropdown-menu,
  .excalidraw-mindmap .excalidraw .App-toolbar__extra-tools-trigger.dropdown-menu-button--mobile > .dropdown-menu {
    left: 0 !important;
    right: auto !important;
    top: 100% !important;
    bottom: auto !important;
    margin-top: 0.375rem !important;
    margin-right: 0 !important;
    max-height: 50vh !important;
  }

  .excalidraw-mindmap .excalidraw .dropdown-menu-button--mobile + .dropdown-menu,
  .excalidraw-mindmap .excalidraw .dropdown-menu-button--mobile > .dropdown-menu {
    left: auto !important;
    right: 100% !important;
    top: 0 !important;
    bottom: auto !important;
    margin-top: 0 !important;
    margin-right: 0.375rem !important;
    max-height: 50vh !important;
  }

  .excalidraw-mindmap .excalidraw [aria-label="Delete"],
  .excalidraw-mindmap .excalidraw [aria-label="Duplicate"],
  .excalidraw-mindmap .excalidraw [aria-label="Edit"] {
    display: inline-flex !important;
  }

  .excalidraw-mindmap .excalidraw .Island.App-toolbar {
    display: none !important;
  }

  .excalidraw-mindmap.shapes-toolbar-visible .excalidraw .Island.App-toolbar {
    display: flex !important;
  }

  .excalidraw-mindmap .excalidraw .main-menu-trigger {
    background-color: transparent !important;
    box-shadow: none !important;
  }

  .excalidraw-mindmap .excalidraw .main-menu-trigger:active {
    box-shadow: 0 0 0 1px var(--button-active-border, var(--color-primary-darkest)) inset !important;
    background-color: var(--button-hover-bg) !important;
  }

  .mindmap-shapes-toggle-container {
    display: contents;
  }

  .mindmap-shapes-toggle-btn {
    width: 2rem !important;
    height: 2rem !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: transparent !important;
    border: 0 !important;
    color: var(--icon-fill-color, #1c1c1c) !important;
    cursor: pointer !important;
    padding: 0 !important;
    border-radius: var(--border-radius-default, 4px) !important;
    box-shadow: none !important;
  }

  .mindmap-shapes-toggle-btn:hover {
    background: var(--button-hover-bg, #f5f5f5) !important;
  }

  .mindmap-shapes-toggle-btn.active {
    background: var(--color-primary-light, #e3f2fd) !important;
    color: var(--color-primary, #1971c2) !important;
  }

  .mindmap-shapes-toggle-btn svg {
    width: 1.25rem !important;
    height: 1.25rem !important;
  }
`.trim()

export function MindMap() {
  const [mounted, setMounted] = useState(false)
  const [shapesToolbarVisible, setShapesToolbarVisible] = useState(false)
  const [toolbarContainer, setToolbarContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const mindmapEl = document.querySelector(".excalidraw-mindmap")
    if (!mindmapEl) return

    const findAndInsertContainer = () => {
      const menuTrigger = mindmapEl.querySelector(".main-menu-trigger")
      if (menuTrigger?.parentElement) {
        let container: HTMLElement | null = menuTrigger.parentElement.querySelector(".mindmap-shapes-toggle-container")
        if (!container) {
          container = document.createElement("div")
          container.className = "mindmap-shapes-toggle-container"
          menuTrigger.parentElement.insertBefore(container, menuTrigger.nextSibling)
        }
        setToolbarContainer(container)
        return true
      }
      return false
    }

    if (findAndInsertContainer()) return

    const observer = new MutationObserver(() => {
      if (findAndInsertContainer()) {
        observer.disconnect()
      }
    })

    observer.observe(mindmapEl, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [mounted])

  const toggleShapesToolbar = useCallback(() => {
    setShapesToolbarVisible((prev) => !prev)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#fafafa]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <>
      <style>{EXCALIDRAW_OVERRIDES_CSS}</style>
      <div className={`relative w-full h-full bg-[#fafafa] excalidraw-container excalidraw-mindmap overflow-hidden${shapesToolbarVisible ? " shapes-toolbar-visible" : ""}`}>
        <Excalidraw
          initialData={{
            elements: INITIAL_ELEMENTS as any,
            appState: {
              viewBackgroundColor: "#fafafa",
            },
          }}
          onChange={() => {}}
        />
        {toolbarContainer && createPortal(
          <button
            type="button"
            className={`mindmap-shapes-toggle-btn${shapesToolbarVisible ? " active" : ""}`}
            title="绘图工具"
            onClick={toggleShapesToolbar}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l-4 7h8z"></path>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
            </svg>
          </button>,
          toolbarContainer
        )}
      </div>
    </>
  )
}