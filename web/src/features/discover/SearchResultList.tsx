import type { SearchItem } from '../../lib/api/types'
import { formatCount, formatTimestamp } from '../../lib/format'
import { cleanUrl } from '../../lib/link'
import { Skeleton } from '../../components/ui/skeleton'
import { SafeHtml } from '../../components/SafeHtml'
import { EmptyState } from '../../components/EmptyState'

/**
 * 搜索结果列表。03 与 04 的条目字段完全相同(实测差集为空),所以共用一套渲染。
 */
export function SearchResultList({
  isPending,
  items,
  emptyReason,
  hasMore,
}: {
  isPending: boolean
  items?: SearchItem[]
  emptyReason?: string
  hasMore?: boolean
}) {
  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <EmptyState>{emptyReason || '没有找到相关内容'}</EmptyState>
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        共 {items.length} 条
        {/* 实测 HasMore 恒为 false,03/04 都没有分页 */}
        {hasMore ? ',还有更多' : ',接口不提供分页,已全部返回'}
      </p>

      <ol>
        {items.map((item, index) => (
          <ResultRow
            key={`${item.ContentType}-${item.ContentID ?? index}`}
            item={item}
            index={index}
            total={items.length}
          />
        ))}
      </ol>
    </div>
  )
}

/**
 * 左边缘的强度条,从首条线性衰减。
 *
 * 这里用色条、KPI 指标却不用,是因为这是一条**连续渐变序列**,
 * 表达的是"顺序";指标带的并列色条表达的是"若干无关项",
 * 会把强调色降级成背景纹理。
 */
function strengthOpacity(index: number, total: number) {
  if (total <= 1) return 0.9
  return 0.9 - (0.75 * index) / (total - 1)
}

function ResultRow({ item, index, total }: { item: SearchItem; index: number; total: number }) {
  const url = item.Url ? cleanUrl(item.Url) : undefined

  return (
    <li className="relative border-b border-border py-3 pl-4 last:border-b-0">
      <span
        className="bg-primary absolute inset-y-0 left-0 w-0.5"
        style={{ opacity: strengthOpacity(index, total) }}
      />

      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm leading-snug font-medium">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary underline-offset-4 hover:underline"
            >
              {item.Title || '无标题'}
            </a>
          ) : (
            (item.Title ?? '无标题')
          )}
        </h3>
        <div className="tabular text-muted-foreground flex shrink-0 gap-3 text-xs">
          <span>赞 {formatCount(item.VoteUpCount)}</span>
          <span>评论 {formatCount(item.CommentCount)}</span>
        </div>
      </div>

      {item.ContentText ? (
        // 摘要混了 <em>(HTML)和 **粗体**(markdown),统一走 SafeHtml 消毒出口
        <SafeHtml
          html={item.ContentText}
          variant="snippet"
          className="text-muted-foreground mt-1.5 line-clamp-3 text-xs leading-6 [&_em]:text-foreground [&_em]:not-italic [&_strong]:text-foreground [&_strong]:font-medium"
        />
      ) : null}

      <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
        {item.AuthorName ? <span className="text-foreground">{item.AuthorName}</span> : null}
        {item.AuthorBadgeText ? <span>{item.AuthorBadgeText}</span> : null}
        <span className="tabular">{formatTimestamp(item.EditTime)}</span>
      </p>
    </li>
  )
}