// runtime/skills/install.ts —— 技能安装/上传/卸载（skills/ 唯一写者）
import fs from "fs"
import path from "path"
import { SKILLS_ROOT, scanSkillsDir, SAFE_NAME_RE } from "./registry"
import { SKILL_CATALOG } from "./catalog"
import type { SkillCatalogEntry, SkillIndexEntry } from "../shared/types"

/** 安装/上传/卸载统一错误：携带 HTTP 状态码，server 层直接透传 */
export class SkillError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "SkillError"
  }
}

/** 精选列表（含是否已安装），root 可注入便于测试 */
export function catalogSkills(root: string = SKILLS_ROOT): SkillCatalogEntry[] {
  const installed = new Set(scanSkillsDir(root).map((s) => s.name))
  return SKILL_CATALOG.map((s) => ({
    name: s.name,
    description: s.description,
    version: s.version,
    default: s.default,
    preinstalled: installed.has(s.name),
  }))
}

/** 从精选目录安装：写 skills/<name>/SKILL.md */
export function installCuratedSkill(root: string = SKILLS_ROOT, name: string): SkillIndexEntry {
  if (!SAFE_NAME_RE.test(name)) throw new SkillError(400, "技能名不合法")
  const skill = SKILL_CATALOG.find((s) => s.name === name)
  if (!skill) throw new SkillError(404, "技能不在精选目录中")
  const target = path.resolve(root, name)
  const resolvedRoot = path.resolve(root)
  if (target !== resolvedRoot && !target.startsWith(resolvedRoot + path.sep)) {
    throw new SkillError(400, "技能名不合法")
  }
  if (fs.existsSync(target)) throw new SkillError(409, `技能 ${name} 已存在，请先卸载`)
  fs.mkdirSync(target, { recursive: true })
  fs.writeFileSync(path.join(target, "SKILL.md"), skill.content)
  return { name: skill.name, description: skill.description, version: skill.version, default: skill.default }
}

/** 卸载：删除 skills/<name> 目录 */
export function deleteSkill(root: string = SKILLS_ROOT, name: string): void {
  if (!SAFE_NAME_RE.test(name)) throw new SkillError(400, "技能名不合法")
  const target = path.resolve(root, name)
  const resolvedRoot = path.resolve(root)
  if (target !== resolvedRoot && !target.startsWith(resolvedRoot + path.sep)) {
    throw new SkillError(400, "技能名不合法")
  }
  if (!fs.existsSync(target)) throw new SkillError(404, "技能不存在")
  fs.rmSync(target, { recursive: true, force: true })
}
