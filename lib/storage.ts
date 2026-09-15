// lib/storage.ts —— localStorage 键名集中定义 + 旧键迁移
//
// 项目曾用名 video-shancn，早期版本把聊天记录与所选模型存在 `video-shancn-*` 键下。
// 直接改键名会让既有本地数据"凭空消失"（数据还在浏览器里，但再也读不到），
// 因此读取时做一次向前迁移：新键没有值就回落到旧键，并写入新键。

export const STORAGE_KEYS = {
  /** AI 对话历史（含分支） */
  chats: "video-study-agent-chats",
  /** 对话页选中的模型 */
  selectedModel: "video-study-agent-selected-model",
} as const

export type StorageKey = keyof typeof STORAGE_KEYS

/** 旧（video-shancn 时代）键名，仅用于一次性迁移 */
const LEGACY_STORAGE_KEYS: Record<StorageKey, string> = {
  chats: "video-shancn-chats",
  selectedModel: "video-shancn-selected-model",
}

/** 读取；新键缺失时自动迁移旧键。localStorage 不可用（SSR/隐私模式）时返回 null。 */
export function readStored(key: StorageKey): string | null {
  if (typeof window === "undefined") return null
  try {
    const current = window.localStorage.getItem(STORAGE_KEYS[key])
    if (current !== null) return current

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEYS[key])
    if (legacy === null) return null

    // 迁移到新键名。旧键保留，便于回滚到旧版本代码时不丢数据。
    window.localStorage.setItem(STORAGE_KEYS[key], legacy)
    return legacy
  } catch {
    return null
  }
}

/** 写入；隐私模式或配额写满时静默失败，不打断调用方。 */
export function writeStored(key: StorageKey, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEYS[key], value)
  } catch {
    /* 忽略：localStorage 不可用 */
  }
}
