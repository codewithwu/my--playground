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
import { Skeleton } from '../../components/ui/skeleton'
import { DataRow, DeltaText, Metric, MetricBand, MetricCell, MissingValue } from '../../components/Metric'
import { LedgerBlock, LedgerSection } from '../../components/Ledger'
import { QuotaMeter } from '../../components/QuotaMeter'
import { PageHeader } from '../../components/layout/AppShell'
import { AudienceSection } from './AudienceSection'
import { InteractionsSection } from './InteractionsSection'

const MINUTE = 60 * 1000

export function OverviewPage() {
  // staleTime 按接口能力分级。查询本身不消耗额度(02 除外,
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
    return (
      <div className="p-6">
        <Alert tone="destructive">{describeError(statsQuery.error)}</Alert>
      </div>
    )
  }

  if (statsQuery.isPending) {
    return <OverviewSkeleton />
  }

  return (
    <div className="space-y-10 p-6 lg:p-8">
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

      {/* 四个头条指标。图标全部拿掉 —— 数字本身够醒目了,
          图标只会把这一排的高低推得不齐。 */}
      <MetricBand>
        <MetricCell>
          <Metric
            label="总阅读"
            value={metrics?.ViewCount === undefined ? <MissingValue /> : formatCount(metrics.ViewCount)}
          />
        </MetricCell>
        <MetricCell>
          <Metric
            label="获赞"
            value={
              metrics?.UpvoteCount === undefined ? <MissingValue /> : formatCount(metrics.UpvoteCount)
            }
          />
        </MetricCell>
        <MetricCell>
          <Metric
            label="收藏"
            value={
              metrics?.CollectCount === undefined ? <MissingValue /> : formatCount(metrics.CollectCount)
            }
          />
        </MetricCell>
        <MetricCell>
          <Metric
            label="评论"
            value={
              metrics?.CommentCount === undefined ? <MissingValue /> : formatCount(metrics.CommentCount)
            }
          />
        </MetricCell>
      </MetricBand>

      <LedgerSection title="账号">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <LedgerBlock title="粉丝">
            <div className="grid grid-cols-3 gap-4 pt-3">
              <Metric
                label="总数"
                value={followers?.Total === undefined ? <MissingValue /> : formatCount(followers.Total)}
              />
              <Metric
                label="活跃粉丝"
                value={
                  followers?.ActiveCount === undefined ? (
                    <MissingValue />
                  ) : (
                    formatCount(followers.ActiveCount)
                  )
                }
                /* String 型且已带百分号,原样透传 */
                hint={formatRate(followers?.ActiveRatio)}
              />
              <Metric
                label="昨日变化"
                value={
                  <>
                    新增{' '}
                    <DeltaText positive={hasPositive(followers?.NewYesterday)}>
                      {formatDelta(followers?.NewYesterday)}
                    </DeltaText>
                  </>
                }
                hint={
                  <>
                    取关{' '}
                    <DeltaText positive={hasPositive(followers?.CancelledYesterday)}>
                      {formatCount(followers?.CancelledYesterday)}
                    </DeltaText>
                  </>
                }
              />
            </div>
          </LedgerBlock>

          <LedgerBlock title="创作数量">
            <dl className="pt-0.5">
              <DataRow label="回答" value={count(creation?.Answer)} />
              <DataRow label="文章" value={count(creation?.Article)} />
              <DataRow label="视频" value={count(creation?.Video)} />
            </dl>
          </LedgerBlock>
        </div>
      </LedgerSection>

      <AudienceSection reader={readerAudience} follower={followerProfile?.Audience} />

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

function count(value?: number) {
  return value === undefined ? <MissingValue /> : formatCount(value)
}

function OverviewSkeleton() {
  return (
    <div className="space-y-10 p-6 lg:p-8">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 gap-y-7 border-y border-border px-1 py-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12 lg:pl-7 lg:first:pl-0" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}