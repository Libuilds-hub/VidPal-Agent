// lib/provider-serializer.ts —— LLM 供应商的对外序列化
//
// 背景：`LlmProvider.apiKey` 是明文密钥。任何返回给浏览器的报文都必须是脱敏副本，
// 否则密钥会进入页面 HTML / DOM（历史实现曾把它当作 placeholder）以及网络面板。
//
// 约定：脱敏值对「已配置」的供应商始终非空，因此服务端与客户端已有的
// `if (p.apiKey)` 真值判断（是否已配置）保持语义不变；`hasApiKey` 供显式判断使用。

export interface ProviderWithKey {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  models: string
  isDefault: boolean
  enableThinking: boolean
  enabled: boolean
  logo?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export interface PublicProvider extends Omit<ProviderWithKey, "apiKey"> {
  /** 脱敏后的 Key（未配置时为空字符串），仅用于展示，不可回写 */
  apiKey: string
  /** 是否已配置明文 Key；写入新 Key 时用它决定是否覆盖 */
  hasApiKey: boolean
}

/** 保留首尾各 4 位，中间固定长度打码；太短的 Key 整体打码。 */
export function maskKey(key: string | null | undefined): string {
  if (!key) return ""
  if (key.length <= 8) return "********"
  return `${key.slice(0, 4)}********${key.slice(-4)}`
}

/** 把数据库行转换成可安全返回给客户端的对象。 */
export function toPublicProvider<T extends ProviderWithKey>(provider: T): PublicProvider {
  const { apiKey, ...rest } = provider
  return {
    ...rest,
    apiKey: maskKey(apiKey),
    hasApiKey: Boolean(apiKey),
  }
}

export function publicProviders<T extends ProviderWithKey>(providers: T[]): PublicProvider[] {
  return providers.map(toPublicProvider)
}
