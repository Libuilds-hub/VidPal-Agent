// runtime/skills/registry.ts —— 技能系统：扫描 skills/*/SKILL.md（frontmatter）+ 按名装载
import fs from "fs"
import path from "path"

export interface SkillIndexEntry {
  name: string
  description: string
  version: string
  default: boolean
}

export const SKILLS_ROOT = path.join(process.cwd(), "skills")

interface Frontmatter {
  name?: string
  description?: string
  version?: string
  default?: boolean
}

/** 解析 SKILL.md 的 frontmatter（--- 包裹的 key: value 块）与正文 */
export function parseSkillFile(raw: string): { meta: Frontmatter; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) return { meta: {}, body: raw }
  const meta: Frontmatter = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line.trim())
    if (!kv) continue
    const key = kv[1]
    const value = kv[2].trim()
    if (key === "default") meta.default = value === "true"
    else if (key === "name" || key === "description" || key === "version") {
      ;(meta as Record<string, string>)[key] = value
    }
  }
  return { meta, body: m[2].trim() }
}

/** 扫描技能目录，返回索引（跳过解析失败/无 name 的） */
export function scanSkillsDir(root: string = SKILLS_ROOT): SkillIndexEntry[] {
  if (!fs.existsSync(root)) return []
  const entries: SkillIndexEntry[] = []
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const skillFile = path.join(root, dir.name, "SKILL.md")
    if (!fs.existsSync(skillFile)) continue
    const { meta } = parseSkillFile(fs.readFileSync(skillFile, "utf-8"))
    if (!meta.name) continue
    entries.push({
      name: meta.name,
      description: meta.description ?? "",
      version: meta.version ?? "0.0.0",
      default: meta.default ?? false,
    })
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

/** 按名装载技能完整内容；不存在返回 null */
export function loadSkill(root: string, name: string): string | null {
  const skillFile = path.join(root, name, "SKILL.md")
  if (!fs.existsSync(skillFile)) return null
  const { body } = parseSkillFile(fs.readFileSync(skillFile, "utf-8"))
  return body
}
