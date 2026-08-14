// runtime/tools/fs-tools.ts —— 文件工具：read_file / write_file / list_dir
// 安全底线：所有路径必须解析后位于工作区内（防路径穿越/越权读写）
import fs from "fs"
import path from "path"
import { z } from "zod"
import type { AgentTool, ToolResult } from "./registry"

export function createFsTools(workspace: string): AgentTool[] {
  const root = path.resolve(workspace)

  /**
   * 解析并校验路径在根目录内，返回绝对路径；越界抛错。
   * 词法校验之外再做 realpath 校验：跟随符号链接/junction 解析真实路径，
   * 防止工作区内指向外部的链接导致越权读写（已存在的文件/目录直接解析真实路径；
   * 新文件则解析其父目录，阻止经链接把文件写到白名单外）。
   */
  function resolveInside(rootDir: string, p: string, allowNewFile = false): string {
    const abs = path.resolve(rootDir, p)
    const realRoot = fs.realpathSync(rootDir)
    // Windows 下路径大小写不敏感：realpath 来自同一盘符，统一小写比较安全
    const fold = (s: string) => (process.platform === "win32" ? s.toLowerCase() : s)
    const rootKey = fold(realRoot)
    const check = (target: string) => {
      const t = fold(target)
      if (t !== rootKey && !t.startsWith(rootKey + path.sep)) {
        throw new Error(`路径在白名单外: ${p}`)
      }
    }
    if (fs.existsSync(abs)) {
      check(fs.realpathSync(abs)) // 已存在：直接解析真实路径（跟随符号链接）
    } else if (allowNewFile) {
      check(fs.realpathSync(path.dirname(abs))) // 新文件：解析父目录真实路径
    } else {
      // 不存在时无真实路径可泄露；但词法上已越界的仍按白名单外报错（保留既有行为）
      const a = fold(abs)
      if (a !== rootKey && !a.startsWith(rootKey + path.sep)) {
        throw new Error(`路径在白名单外: ${p}`)
      }
      throw new Error(`文件不存在: ${p}`)
    }
    return abs
  }

  const readFileSchema = z.object({ path: z.string() })
  const writeFileSchema = z.object({ path: z.string(), content: z.string() })
  const listDirSchema = z.object({ path: z.string().default(".") })

  const readFileTool: AgentTool<typeof readFileSchema> = {
    name: "read_file",
    description: "读取工作区内文本文件内容（文件较大时只返回前 10000 字符）",
    inputSchema: readFileSchema,
    dangerous: false,
    async execute(args) {
      const abs = resolveInside(root, args.path)
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        throw new Error(`文件不存在: ${args.path}`)
      }
      // 大小超限直接拒绝，避免一次性读入超大文件导致 OOM
      const MAX_BYTES = 10 * 1024 * 1024
      const size = fs.statSync(abs).size
      if (size > MAX_BYTES) {
        throw new Error(`文件过大（${(size / (1024 * 1024)).toFixed(1)} MB），拒绝读取`)
      }
      const content = fs.readFileSync(abs, "utf-8")
      const MAX = 10_000
      const truncated = content.length > MAX
      return {
        summary: truncated ? content.slice(0, MAX) + `\n…（已截断，共 ${content.length} 字符）` : content,
      }
    },
  }

  const writeFileTool: AgentTool<typeof writeFileSchema> = {
    name: "write_file",
    description: "写入文件（覆盖）。只能写工作区内路径。",
    inputSchema: writeFileSchema,
    dangerous: true,
    async execute(args) {
      const abs = resolveInside(root, args.path, true)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, args.content, "utf-8")
      return { summary: `已写入 ${args.path}（${args.content.length} 字符）` }
    },
  }

  const listDirTool: AgentTool<typeof listDirSchema> = {
    name: "list_dir",
    description: "列出工作区内目录的条目（名称 + 类型 + 大小）",
    inputSchema: listDirSchema,
    dangerous: false,
    async execute(args) {
      const abs = resolveInside(root, args.path)
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        throw new Error(`目录不存在: ${args.path}`)
      }
      const entries = fs.readdirSync(abs, { withFileTypes: true })
      const lines = entries.map((e) => {
        if (e.isDirectory()) return `${e.name}/`
        const size = fs.statSync(path.join(abs, e.name)).size
        return `${e.name} (${size}B)`
      })
      return { summary: lines.length ? lines.join("\n") : "（空目录）" }
    },
  }

  return [readFileTool, writeFileTool, listDirTool]
}
