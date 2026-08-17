// runtime/skills/install.ts —— 技能安装/上传/卸载（skills/ 唯一写者）
import fs from "fs"
import path from "path"
import yauzl from "yauzl"
import type { Entry } from "yauzl"
import { SKILLS_ROOT, scanSkillsDir, SAFE_NAME_RE, parseSkillFile } from "./registry"
import { SKILL_CATALOG } from "./catalog"
import type { SkillCatalogEntry, SkillIndexEntry } from "../shared/types"

export const MAX_ZIP_BYTES = 10 * 1024 * 1024
export const MAX_TOTAL_EXTRACT_BYTES = 20 * 1024 * 1024
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_ENTRIES = 200
export const MAX_ENTRY_DEPTH = 8

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

interface ZipEntryInfo {
  /** 经规范化/校验的条目路径（"/" 分隔，相对 zip 根） */
  relPath: string
  entry: Entry
}

/** 读取单个 zip 条目的完整数据 */
async function readEntryData(zipfile: yauzl.ZipFile, entry: Entry): Promise<Buffer> {
  try {
    const stream = await zipfile.openReadStreamPromise(entry)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    return Buffer.concat(chunks)
  } catch (err) {
    throw new SkillError(400, `ZIP 条目读取失败：${(err as Error).message}`)
  }
}

/** 规范化并校验条目名：拒绝绝对路径/../反斜杠/盘符/超深；不合法返回 null */
function normalizeEntryName(fileName: string): string | null {
  if (fileName.startsWith("/")) return null
  if (fileName.includes("\\")) return null
  if (/^[A-Za-z]:/.test(fileName)) return null
  const parts = fileName.split("/").filter((p) => p.length > 0 && p !== ".")
  if (parts.length === 0 || parts.some((p) => p === "..")) return null
  if (parts.length > MAX_ENTRY_DEPTH) return null
  return parts.join("/")
}

/** 判断 zip 条目是否为 unix 符号链接（Windows zip 一般无此位，视为普通文件——写入仍在 root 内，安全） */
export function isSymlink(entry: Entry): boolean {
  const mode = (entry.externalFileAttributes >>> 16) & 0o170000
  return mode === 0o120000
}

/** 上传 ZIP 并安装；返回技能元数据 */
export async function uploadSkillZip(root: string = SKILLS_ROOT, buf: Buffer): Promise<SkillIndexEntry> {
  if (buf.length > MAX_ZIP_BYTES) throw new SkillError(413, "ZIP 超过 10MB 上限")
  let zipfile: yauzl.ZipFile
  try {
    // fromBuffer 强制 lazyEntries + autoClose=false：读完条目后 reader 保持打开，
    // 可继续按 entry 读取数据流，最后统一 close()
    zipfile = await yauzl.fromBufferPromise(buf)
  } catch (err) {
    throw new SkillError(400, `ZIP 解析失败：${(err as Error).message}`)
  }
  try {
    // 第一遍：收集条目元数据并校验（路径/符号链接/体积/数量）
    const infos: ZipEntryInfo[] = []
    let totalUncompressed = 0
    try {
      for await (const entry of zipfile.eachEntry()) {
        if (!entry.canDecodeFileData()) throw new SkillError(400, `ZIP 条目无法解压：${entry.fileName}`)
        if (isSymlink(entry)) throw new SkillError(400, "ZIP 不允许包含符号链接")
        const relPath = normalizeEntryName(entry.fileName)
        if (!relPath) throw new SkillError(400, `ZIP 条目路径不合法：${entry.fileName}`)
        totalUncompressed += entry.uncompressedSize
        if (totalUncompressed > MAX_TOTAL_EXTRACT_BYTES) throw new SkillError(413, "ZIP 解压总量超过 20MB 上限")
        if (infos.length >= MAX_ENTRIES) throw new SkillError(400, "ZIP 条目过多（上限 200）")
        infos.push({ relPath, entry })
      }
    } catch (err) {
      // yauzl 会在解析阶段拒绝绝对路径/../等恶意条目（普通 Error）；
      // 我们的 SkillError（体积/名称等）原样透传，其余统一转 400
      if (err instanceof SkillError) throw err
      throw new SkillError(400, `ZIP 条目解析失败：${(err as Error).message}`)
    }

    const isDirectory = (relPath: string) => relPath.endsWith("/")
    const files = infos.filter((i) => !isDirectory(i.relPath))
    const skillMdFiles = files.filter((f) => f.relPath.split("/").slice(-1)[0] === "SKILL.md")
    if (skillMdFiles.length !== 1) throw new SkillError(400, "ZIP 中必须且只能有一个 SKILL.md")
    const skillMdInfo = skillMdFiles[0]

    // 结构判定：结构 1 = SKILL.md 在根；结构 2 = 单层顶层文件夹
    const topSegments = new Set(files.map((f) => f.relPath.split("/")[0]))
    const isStructure1 = !skillMdInfo.relPath.includes("/")
    const topFolder = skillMdInfo.relPath.split("/")[0]
    const isStructure2 = !isStructure1 && topSegments.size === 1 && topSegments.has(topFolder)
    if (!isStructure1 && !isStructure2) {
      throw new SkillError(400, "ZIP 结构不合法：SKILL.md 需位于根目录或单层顶层文件夹内")
    }

    // 读 SKILL.md 并校验 frontmatter name
    const skillMdData = await readEntryData(zipfile, skillMdInfo.entry)
    if (skillMdData.length > MAX_FILE_BYTES) throw new SkillError(400, "SKILL.md 超过 10MB 上限")
    const meta = parseSkillFile(skillMdData.toString("utf-8")).meta
    const skillName = isStructure1 ? meta.name : topFolder
    if (!skillName || !SAFE_NAME_RE.test(skillName)) {
      throw new SkillError(400, `技能名不合法：${skillName ?? "（缺失）"}`)
    }
    if (meta.name !== skillName) {
      throw new SkillError(400, `frontmatter name（${meta.name ?? "缺失"}）与目录名（${skillName}）不一致`)
    }

    const targetDir = path.resolve(root, skillName)
    const resolvedRoot = path.resolve(root)
    if (targetDir !== resolvedRoot && !targetDir.startsWith(resolvedRoot + path.sep)) {
      throw new SkillError(400, "技能名不合法")
    }
    if (fs.existsSync(targetDir)) throw new SkillError(409, `技能 ${skillName} 已存在，请先卸载`)

    // 第二遍：写入文件（结构 2 剥掉顶层文件夹前缀）
    const stripPrefix = isStructure1 ? "" : topFolder + "/"
    fs.mkdirSync(targetDir, { recursive: true })
    for (const info of infos) {
      if (isDirectory(info.relPath)) continue
      const rel = stripPrefix && info.relPath.startsWith(stripPrefix)
        ? info.relPath.slice(stripPrefix.length)
        : isStructure1
          ? info.relPath
          : null
      if (rel === null) continue // 结构判定已保证不会发生；防御性跳过
      const target = path.resolve(targetDir, ...rel.split("/"))
      if (target !== targetDir && !target.startsWith(targetDir + path.sep)) {
        throw new SkillError(400, "ZIP 条目路径越界")
      }
      fs.mkdirSync(path.dirname(target), { recursive: true })
      if (info.entry === skillMdInfo.entry) {
        fs.writeFileSync(target, skillMdData)
        continue
      }
      const data = await readEntryData(zipfile, info.entry)
      if (data.length > MAX_FILE_BYTES) throw new SkillError(400, `文件超过 10MB 上限：${info.relPath}`)
      fs.writeFileSync(target, data)
    }

    return {
      name: skillName,
      description: meta.description ?? "",
      version: meta.version ?? "0.0.0",
      default: meta.default ?? false,
    }
  } finally {
    zipfile.close()
  }
}
