import type { AudienceContentItem } from './api/types'

/**
 * 剥离知乎开放平台加在 URL 上的溯源参数。
 * 实测返回形如 ...?utm_medium=openapi_platform&utm_source=cf621feb3f2d
 * ——把访客点击的每个链接都带着平台追踪参数弹出去,既是隐私噪音,
 * 点开后的 URL 也很难看。
 */
export function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw)
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_')) url.searchParams.delete(key)
    }
    const query = url.searchParams.toString()
    return `${url.origin}${url.pathname}${query ? `?${query}` : ''}`
  } catch {
    return raw
  }
}

const PATH_SEGMENT: Record<string, string> = {
  answer: 'answer',
  article: 'p',
  pin: 'pin',
  zvideo: 'zvideo',
  file: 'p',
  unknown: 'p',
}

/**
 * 由 ContentType + ContentToken 拼出内容链接。
 * ContentToken 可能超出安全整数范围,所以解析后是字符串 —— 直接拼接即可,
 * 这也是保留无损解析的实际意义之一(PLAN.md §2.9)。
 */
export function contentUrl(item: AudienceContentItem): string {
  const segment = PATH_SEGMENT[item.ContentType] ?? 'p'
  return `https://www.zhihu.com/${segment}/${item.ContentToken}`
}
