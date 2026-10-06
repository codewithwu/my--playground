import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import {
  fetchComments,
  fetchContentDetail,
  fetchContentStats,
} from '../../lib/api/client'
import { describeError } from '../../lib/api/errors'
import type { Comment, CommentNode, ContentMetrics } from '../../lib/api/types'
import { formatCount, formatRate, formatTimestamp } from '../../lib/format'
import { cleanUrl } from '../../lib/link'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { SafeHtml } from '../../components/SafeHtml'
import { DataRow, Metric, MetricBand, MetricCell, MissingValue } from '../../components/Metric'
import { LedgerSection } from '../../components/Ledger'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

/**
 * 单篇内容钻取。
 *
 * 三个接口都走 creator 桶(并发 1),所以总耗时至少 3 秒。
 * 这里的做法是:三个 hook 顺序调用 → 依次入队 → 各自独立的 loading 状态,
 * 用户看到的是「统计先到、正文再到、评论最后」,而不是一个 3 秒的白屏。
 * 限流在调度器源头已经消除,这里不做自动重试。
 */
export function ContentDetail({
  contentUrl,
  onBack,
}: {
  contentUrl: string
  onBack: () => void
}) {
  const [offsets, setOffsets] = useState<number[]>([0])

  // ↓ 顺序即优先级:统计 → 正文 → 评论
  const statsQuery = useQuery({
    queryKey: ['contentStats', contentUrl],
    queryFn: () => fetchContentStats(contentUrl),
    staleTime: 30 * MINUTE,
  })

  const detailQuery = useQuery({
    queryKey: ['contentDetail', contentUrl],
    queryFn: () => fetchContentDetail(contentUrl),
    staleTime: 24 * HOUR,
  })

  const commentQueries = useQueries({
    queries: offsets.map((offset) => ({
      queryKey: ['comments', contentUrl, offset],
      queryFn: () => fetchComments(contentUrl, offset),
      staleTime: 5 * MINUTE,
    })),
  })

  const lastPaging = commentQueries.at(-1)?.data?.Paging
  const canLoadMore = lastPaging?.IsEnd === false && lastPaging?.NextOffset !== undefined

  const item = statsQuery.data?.Items?.[0]
  const metrics = item?.Metrics
  const title = detailQuery.data?.Title || item?.Title || '未命名内容'
  const totalComments = commentQueries.at(-1)?.data?.Paging?.Totals

  return (
    <div className="space-y-10 p-6 lg:p-8">
      <header className="border-b border-border pb-3">
        <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={onBack}>
          <ArrowLeft />
          返回
        </Button>
        <h1 className="text-xl leading-snug font-semibold tracking-tight">{title}</h1>
        <a
          href={cleanUrl(detailQuery.data?.Url || item?.Url || contentUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-1.5 inline-block text-sm underline-offset-4 hover:underline"
        >
          在知乎查看原文
        </a>
      </header>

      <LedgerSection title="表现">
        {statsQuery.isError ? (
          <Alert tone="destructive">{describeError(statsQuery.error)}</Alert>
        ) : statsQuery.isPending ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : metrics ? (
          <MetricsGrid metrics={metrics} />
        ) : (
          <p className="text-muted-foreground text-sm">该内容暂无指标数据</p>
        )}
      </LedgerSection>

      {/* 正文是整页唯一保留卡片的地方:长段落需要一条被框住的行宽,
          否则在宽屏上会一路拉到 1200px,眼睛回扫得很累。 */}
      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-lg font-semibold tracking-tight">正文</h2>
        {detailQuery.isError ? (
          <Alert tone="destructive">{describeError(detailQuery.error)}</Alert>
        ) : detailQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : detailQuery.data?.Body ? (
          <Card>
            <CardContent className="p-6">
              <SafeHtml html={detailQuery.data.Body} className="prose-sm zhihu-body" />
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground text-sm">没有正文内容</p>
        )}
      </section>

      <LedgerSection
        title="评论"
        note={totalComments ? `${formatCount(totalComments)} 条` : undefined}
      >
        {commentQueries[0]?.isError ? (
          <Alert tone="destructive">{describeError(commentQueries[0]!.error)}</Alert>
        ) : commentQueries[0]?.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16 w-4/5" />
          </div>
        ) : (
          <div className="space-y-4">
            {commentQueries.map((query, index) => {
              const nodes = query.data?.Items ?? []
              if (nodes.length === 0) {
                return index === 0 ? (
                  <p key={index} className="text-muted-foreground text-sm">
                    没有评论
                  </p>
                ) : null
              }
              return (
                <ul key={index} className="space-y-4">
                  {nodes.map((node) => (
                    <CommentRow key={String(node.Comment?.ID)} node={node} />
                  ))}
                </ul>
              )
            })}

            {commentQueries.slice(1).some((q) => q.isPending) ? (
              <Skeleton className="h-16" />
            ) : null}

            {canLoadMore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffsets((prev) => [...prev, lastPaging!.NextOffset!])}
              >
                加载更多评论
              </Button>
            ) : null}
          </div>
        )}
      </LedgerSection>
    </div>
  )
}

function MetricsGrid({ metrics }: { metrics: ContentMetrics }) {
  return (
    <div className="space-y-6">
      <MetricBand columns={3}>
        <MetricCell>
          <Metric label="阅读" value={value(metrics.ViewCount)} />
        </MetricCell>
        <MetricCell>
          <Metric label="获赞" value={value(metrics.UpvoteCount)} />
        </MetricCell>
        <MetricCell>
          <Metric label="评论" value={value(metrics.CommentCount)} />
        </MetricCell>
        <MetricCell>
          <Metric label="收藏" value={value(metrics.CollectCount)} />
        </MetricCell>
        <MetricCell>
          <Metric label="转发" value={value(metrics.ShareCount)} />
        </MetricCell>
        <MetricCell>
          <Metric
            label="正向互动率"
            value={
              metrics.PositiveInteractionRate
                ? formatRate(metrics.PositiveInteractionRate)
                : <MissingValue />
            }
          />
        </MetricCell>
      </MetricBand>

      <dl className="grid gap-x-8 sm:grid-cols-2">
        <DataRow label="今日阅读" value={value(metrics.Today?.ViewCount)} />
        <DataRow label="昨日阅读" value={value(metrics.Yesterday?.ViewCount)} />
        <DataRow label="今日获赞" value={value(metrics.Today?.UpvoteCount)} />
        <DataRow label="昨日获赞" value={value(metrics.Yesterday?.UpvoteCount)} />
        <DataRow label="新增关注" value={value(metrics.NewFollowerCount)} />
        <DataRow label="关注净增" value={value(metrics.FollowerGain)} />
      </dl>
    </div>
  )
}

function value(v?: number | string | null): React.ReactNode {
  return v === undefined ? <MissingValue /> : formatCount(v)
}

function CommentRow({ node }: { node: CommentNode }) {
  return (
    <li className="space-y-2">
      <CommentBody comment={node.Comment} />
      {node.Children && node.Children.length > 0 ? (
        <ul className="border-border/70 ml-3 space-y-2 border-l pl-3">
          {node.Children.map((child) => (
            <CommentBody key={String(child.ID)} comment={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function CommentBody({ comment }: { comment: Comment }) {
  return (
    <div>
      <p className="text-muted-foreground flex flex-wrap items-baseline gap-2 text-xs">
        {/* 实测 AuthorToken 是 member token(如 moreyu),不是可读昵称 */}
        <span className="text-foreground font-medium">
          {comment.AuthorToken ?? '知乎用户'}
        </span>
        <span className="tabular">{formatTimestamp(comment.CreatedAt)}</span>
        {comment.LikeCount ? <span className="tabular">赞 {formatCount(comment.LikeCount)}</span> : null}
      </p>
      <SafeHtml
        html={comment.Content}
        className="mt-1 text-sm leading-6 [&_p]:my-1 [&_br]:my-1"
      />
    </div>
  )
}