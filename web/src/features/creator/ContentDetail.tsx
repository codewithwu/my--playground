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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { SafeHtml } from '../../components/SafeHtml'
import { MissingValue, StatCard } from '../../components/StatCard'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

/**
 * 单篇内容钻取。
 *
 * 三个接口都走 creator 桶(并发 1),所以总耗时至少 3 秒。
 * 这里的做法是:三个 hook 顺序调用 → 依次入队 → 各自独立的 loading 状态,
 * 用户看到的是「统计先到、正文再到、评论最后」,而不是一个 3 秒的白屏。
 * 计划 §5.2 明确禁止用自动重试解决限流,限流在调度器源头已经消除。
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

  return (
    <div className="space-y-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={onBack}>
            <ArrowLeft />
            返回
          </Button>
          <h1 className="text-xl leading-snug font-semibold tracking-tight">{title}</h1>
          <a
            href={cleanUrl(detailQuery.data?.Url || item?.Url || contentUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-1 inline-block text-xs underline underline-offset-4"
          >
            在知乎查看原文
          </a>
        </div>
      </div>

      <Section title="表现" error={statsQuery.isError ? statsQuery.error : null} loading={statsQuery.isPending}>
        {metrics ? <MetricsGrid metrics={metrics} /> : <EmptyNote>该内容暂无指标数据</EmptyNote>}
      </Section>

      <Section title="正文" error={detailQuery.isError ? detailQuery.error : null} loading={detailQuery.isPending}>
        {detailQuery.data?.Body ? (
          <SafeHtml
            html={detailQuery.data.Body}
            className="prose-sm leading-7 [&_figure]:my-4 [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-3"
          />
        ) : (
          <EmptyNote>没有正文内容</EmptyNote>
        )}
      </Section>

      <Section
        title={`评论${commentQueries.at(-1)?.data?.Paging?.Totals ? ` · ${formatCount(commentQueries.at(-1)!.data!.Paging!.Totals)}` : ''}`}
        loading={commentQueries[0]?.isPending}
        error={commentQueries[0]?.isError ? commentQueries[0].error : null}
      >
        <div className="space-y-4">
          {commentQueries.map((query, index) => {
            const nodes = query.data?.Items ?? []
            if (nodes.length === 0) {
              return index === 0 ? <EmptyNote key={index}>没有评论</EmptyNote> : null
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
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
  loading,
  error,
}: {
  title: string
  children: React.ReactNode
  loading?: boolean
  error?: unknown
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert tone="destructive">{describeError(error)}</Alert>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function MetricsGrid({ metrics }: { metrics: ContentMetrics }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="阅读" value={value(metrics.ViewCount)} />
        <StatCard label="获赞" value={value(metrics.UpvoteCount)} />
        <StatCard label="评论" value={value(metrics.CommentCount)} />
        <StatCard label="收藏" value={value(metrics.CollectCount)} />
        <StatCard label="转发" value={value(metrics.ShareCount)} />
        <StatCard
          label="正向互动率"
          value={metrics.PositiveInteractionRate ? formatRate(metrics.PositiveInteractionRate) : <MissingValue />}
        />
      </div>

      <dl className="text-muted-foreground grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Row label="今日阅读" value={value(metrics.Today?.ViewCount)} />
        <Row label="昨日阅读" value={value(metrics.Yesterday?.ViewCount)} />
        <Row label="今日获赞" value={value(metrics.Today?.UpvoteCount)} />
        <Row label="昨日获赞" value={value(metrics.Yesterday?.UpvoteCount)} />
        <Row label="新增关注" value={value(metrics.NewFollowerCount)} />
        <Row label="关注净增" value={value(metrics.FollowerGain)} />
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-1">
      <dt>{label}</dt>
      <dd className="tabular text-foreground">{value}</dd>
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

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground py-2 text-sm">{children}</p>
}
