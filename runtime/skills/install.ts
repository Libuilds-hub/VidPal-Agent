// runtime/skills/install.ts —— 技能安装/上传/卸载（skills/ 唯一写者）
import { SKILLS_ROOT, scanSkillsDir, SAFE_NAME_RE } from "./registry"
import { SKILL_CATALOG } from "./catalog"
import type { SkillCatalogEntry } from "../shared/types"

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
