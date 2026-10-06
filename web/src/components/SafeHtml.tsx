import { useMemo } from 'react'
import { sanitize, sanitizeSnippet } from '../lib/sanitize'

/**
 * 渲染不受信任的富文本。
 *
 * ⚠️ 这是全项目**唯一**使用 dangerouslySetInnerHTML 的地方,而且只喂经过
 * 消毒的结果。计划 §6 要求原始用法出现次数为 1,切片 5 会加 ESLint 规则
 * 强制这一点(禁止在别处直接写 dangerouslySetInnerHTML)。
 *
 * variant:
 *   'html'    —— 接口原文(09 正文、10 评论)
 *   'snippet' —— 搜索摘要,额外把 **粗体** markdown 转成 <strong>
 */
export function SafeHtml({
  html,
  variant = 'html',
  className,
}: {
  html: string | undefined | null
  variant?: 'html' | 'snippet'
  className?: string
}) {
  const clean = useMemo(
    () => (variant === 'snippet' ? sanitizeSnippet(html) : sanitize(html)),
    [html, variant],
  )
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
