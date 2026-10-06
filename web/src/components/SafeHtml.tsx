import { useMemo } from 'react'
import { sanitize, sanitizeSnippet } from '../lib/sanitize'

/**
 * 渲染不受信任的富文本。
 *
 * ⚠️ 这是全项目**唯一**使用 dangerouslySetInnerHTML 的地方,而且只喂经过
 * 消毒的结果。ESLint 规则(见 eslint.config.js)禁止在其他文件直接写
 * dangerouslySetInnerHTML,保证原始用法全项目只出现这 1 次。
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
