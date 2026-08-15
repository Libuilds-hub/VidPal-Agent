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

/** SKILL.md 体积上限（超过视为异常技能，跳过） */
const MAX_SKILL_BYTES = 10 * 1024 * 1024

/** 合法技能名白名单：首字符字母/数字，其余字母/数字/._-（拒绝 ..、/、\ 等穿越手段） */
const SAFE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

interface Frontmatter {
  name?: string
  description?: string
  version?: string
  default?: boolean
}

/** 解析 SKILL.md 的 frontmatter（--- 包裹的 key: value 块）与正文（先剥离 BOM） */
export function parseSkillFile(raw: string): { meta: Frontmatter; body: string } {
  const text = raw.replace(/^\uFEFF/, "")
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return { meta: {}, body: text }
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

/** 扫描技能目录，返回索引。键 = 目录名（与 loadSkill 的装载键一致）：
 *  - frontmatter name 与目录名不一致 → 配置错误，警告并跳过；
 *  - 单个目录读取/解析失败（EISDIR、权限、超大文件等）→ 警告并跳过，不影响整体扫描 */
export function scanSkillsDir(root: string = SKILLS_ROOT): SkillIndexEntry[] {
  if (!fs.existsSync(root)) return []
  const entries: SkillIndexEntry[] = []
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const skillFile = path.join(root, dir.name, "SKILL.md")
    if (!fs.existsSync(skillFile)) continue
    let meta: Frontmatter
    try {
      if (fs.statSync(skillFile).size > MAX_SKILL_BYTES) {
        console.warn(`[skills] 跳过技能 ${dir.name}：SKILL.md 超过 10MB`)
        continue
      }
      meta = parseSkillFile(fs.readFileSync(skillFile, "utf-8")).meta
    } catch (err) {
      console.warn(`[skills] 跳过技能 ${dir.name}：读取/解析失败`, err)
      continue
    }
    if (meta.name && meta.name !== dir.name) {
      console.warn(`[skills] 跳过技能 ${dir.name}：frontmatter name（${meta.name}）与目录名不一致`)
      continue
    }
    entries.push({
      name: dir.name,
      description: meta.description ?? "",
      version: meta.version ?? "0.0.0",
      default: meta.default ?? false,
    })
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

/** 按名装载技能完整内容；名称不含法（路径穿越防护）或技能不存在返回 null */
export function loadSkill(root: string, name: string): string | null {
  if (!SAFE_NAME_RE.test(name)) return null
  const skillFile = path.resolve(root, name, "SKILL.md")
  const resolvedRoot = path.resolve(root)
  if (skillFile !== resolvedRoot && !skillFile.startsWith(resolvedRoot + path.sep)) return null
  if (!fs.existsSync(skillFile)) return null
  const { body } = parseSkillFile(fs.readFileSync(skillFile, "utf-8"))
  return body
}
