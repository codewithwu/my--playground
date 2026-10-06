import { useQuery } from '@tanstack/react-query'
import { fetchAccountStats, fetchQuota } from '../../lib/api/client'
import { describeError } from '../../lib/api/errors'
import {
  MISSING,
  describeAudienceStatus,
  formatCount,
  formatDelta,
  formatRate,
  formatUpdated,
} from '../../lib/format'
import { Alert } from '../../components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { DeltaText, MissingValue, StatCard } from '../../components/StatCard'
import { QuotaMeter } from '../../components/QuotaMeter'
import { PageHeader } from '../../components/layout/AppShell'
import { AudienceSection } from './AudienceSection'
import { InteractionsSection } from './InteractionsSection'

const MINUTE = 60 * 1000

export function OverviewPage() {
  // staleTime 按 PLAN.md §5.3 分级。查询本身不消耗额度(02 除外,
  // 但 02 不消耗任何额度),creator 额度只有 200/天,隐式重取是主要风险。
  const quotaQuery = useQuery({
    queryKey: ['quota'],
    queryFn: fetchQuota,
    staleTime: MINUTE,
  })

  const statsQuery = useQuery({
    queryKey: ['accountStats'],
    queryFn: fetchAccountStats,
    staleTime: 30 * MINUTE,
  })

  const metrics = statsQuery.data?.Metrics
  const followers = statsQuery.data?.Followers
  const creation = statsQuery.data?.CreationCounts
  const readerAudience = statsQuery.data?.Audience
  const followerProfile = statsQuery.data?.FollowerProfile
  const audienceStatus = readerAudience?.Status

  if (statsQuery.isError) {
    return <Alert tone="destructive">{describeError(statsQuery.error)}</Alert>
  }

  if (statsQuery.isPending) {
    return <OverviewSkeleton />
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="总览"
        description={
          <>
            数据更新于{' '}
            <span className="tabular">
              {metrics?.Updated ? formatUpdated(metrics.Updated) : MISSING}
            </span>
          </>
        }
      />

      {audienceStatus && audienceStatus !== 'normal' ? (
        <Alert tone="warning">
          受众画像数据{describeAudienceStatus(audienceStatus).toLowerCase()},下方相关指标可能不完整。
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="总阅读"
          value={metrics?.ViewCount === undefined ? <MissingValue /> : formatCount(metrics.ViewCount)}
        />
        <StatCard
          label="获赞"
          value={
            metrics?.UpvoteCount === undefined ? <MissingValue /> : formatCount(metrics.UpvoteCount)
          }
        />
        <StatCard
          label="收藏"
          value={
            metrics?.CollectCount === undefined ? <MissingValue /> : formatCount(metrics.CollectCount)
          }
        />
        <StatCard
          label="评论"
          value={
            metrics?.CommentCount === undefined
              ? <MissingValue />
              : formatCount(metrics.CommentCount)
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>粉丝</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">粉丝总数</p>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight">
                {followers?.Total === undefined ? <MissingValue /> : formatCount(followers.Total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">活跃粉丝</p>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight">
                {followers?.ActiveCount === undefined ? (
                  <MissingValue />
                ) : (
                  formatCount(followers.ActiveCount)
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {/* String 型且已带百分号,原样透传 */}
                {formatRate(followers?.ActiveRatio)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">昨日变化</p>
              <p className="tabular mt-1 text-sm">
                新增 <DeltaText positive={hasPositive(followers?.NewYesterday)}>
                  {formatDelta(followers?.NewYesterday)}
                </DeltaText>
              </p>
              <p className="tabular mt-0.5 text-sm">
                取关 <DeltaText positive={hasPositive(followers?.CancelledYesterday)}>
                  取关 {formatCount(followers?.CancelledYesterday)}
                </DeltaText>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>创作数量</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="回答" value={creation?.Answer} />
            <Row label="文章" value={creation?.Article} />
            <Row label="视频" value={creation?.Video} />
          </CardContent>
        </Card>
      </div>

      <AudienceSection
        reader={readerAudience}
        follower={followerProfile?.Audience}
      />

      <InteractionsSection
        interactions={followerProfile?.Interactions}
        acquisition={followerProfile?.Audience?.Content}
      />

      {quotaQuery.isError ? (
        <Alert tone="warning">额度信息获取失败:{describeError(quotaQuery.error)}</Alert>
      ) : quotaQuery.data ? (
        <QuotaMeter entries={quotaQuery.data} />
      ) : null}
    </div>
  )
}

function hasPositive(value?: number): boolean | undefined {
  if (value === undefined || value === 0) return undefined
  return value > 0
}

function Row({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">
        {value === undefined ? <MissingValue /> : formatCount(value)}
      </span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44 lg:col-span-2" />
        <Skeleton className="h-44" />
      </div>
    </div>
  )
}
