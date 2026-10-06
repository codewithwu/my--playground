import type { ReactNode } from 'react'
import type { Audience, AudienceProfileItem } from '../../lib/api/types'
import { describeAudienceStatus } from '../../lib/format'
import { Alert } from '../../components/ui/alert'
import { LedgerBlock, LedgerSection } from '../../components/Ledger'
import { ActiveTimeChart, DistributionBars } from '../../components/charts/DistributionBars'

type DimensionKey = 'Source' | 'Gender' | 'Age' | 'Location' | 'OS' | 'Activeness' | 'Interest'

interface DimensionSpec {
  key: DimensionKey
  label: string
  max?: number
}

/**
 * ⚠️ 顶层 Audience 和 FollowerProfile.Audience 是**两个不同的数据集**,同名不同义:
 *
 *   读者画像 —— 看过你内容的人。Source 分类是 App-推荐 / App-搜索 / PC,
 *              Count 是人次(实测合计 10,962,927)
 *   粉丝画像 —— 关注了你的人。Source 分类是 推荐关注卡片 / 通过文章,
 *              Count 是人数(合计 1294 ≈ 粉丝总数 1299)
 *
 * 合并展示会得出完全错误的结论,所以分成两个独立区块。
 * 同理,Count 只在同一维度内有意义,绝不跨维度求和或比较。
 */
const READER_DIMENSIONS: DimensionSpec[] = [
  { key: 'Source', label: '流量来源' },
  { key: 'Gender', label: '性别' },
  { key: 'Age', label: '年龄' },
  { key: 'Location', label: '地域' },
]

const FOLLOWER_DIMENSIONS: DimensionSpec[] = [
  { key: 'Source', label: '关注来源' },
  { key: 'Activeness', label: '活跃度' },
  { key: 'Interest', label: '兴趣', max: 10 },
  { key: 'OS', label: '操作系统' },
  { key: 'Gender', label: '性别' },
  { key: 'Age', label: '年龄' },
  { key: 'Location', label: '地域' },
]

export function AudienceSection({
  reader,
  follower,
}: {
  reader?: Audience
  follower?: Audience
}) {
  const readerDims = pickDimensions(reader, READER_DIMENSIONS)
  const followerDims = pickDimensions(follower, FOLLOWER_DIMENSIONS)
  const hours = follower?.ActiveTime ?? []

  if (readerDims.length === 0 && followerDims.length === 0 && hours.length === 0) {
    return <Alert tone="warning">受众画像数据暂不可用。</Alert>
  }

  return (
    <LedgerSection title="受众画像">
      {readerDims.length > 0 ? (
        <ProfileGroup
          title="读者画像"
          subtitle="看过你内容的人"
          status={reader?.Status}
          dimensions={readerDims}
        />
      ) : null}

      {followerDims.length > 0 || hours.length > 0 ? (
        <ProfileGroup
          title="粉丝画像"
          subtitle="关注了你的人"
          status={follower?.Status}
          dimensions={followerDims}
          extra={
            hours.length > 0 ? (
              <LedgerBlock title="活跃时段" className="md:col-span-2">
                <ActiveTimeChart items={hours} />
              </LedgerBlock>
            ) : null
          }
        />
      ) : null}
    </LedgerSection>
  )
}

function ProfileGroup({
  title,
  subtitle,
  status,
  dimensions,
  extra,
}: {
  title: string
  subtitle: string
  status?: string
  dimensions: { spec: DimensionSpec; items: AudienceProfileItem[] }[]
  extra?: ReactNode
}) {
  const isNormal = status === undefined || status === 'normal'

  return (
    <div className="space-y-5">
      {/* 子层级标题:比外层分区弱一档,用间距和发丝线区分,不套盒子 */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border pb-2">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <span className="text-muted-foreground text-sm">{subtitle}</span>
        {!isNormal ? (
          <span className="text-warning ml-auto text-xs">{describeAudienceStatus(status)}</span>
        ) : null}
      </div>

      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map(({ spec, items }) => (
          <LedgerBlock key={spec.key} title={spec.label}>
            <DistributionBars items={items} max={spec.max} />
          </LedgerBlock>
        ))}
        {extra}
      </div>
    </div>
  )
}

/** 只挑出实际有数据的维度 —— 接口对无数据的维度是直接不返回该字段。 */
function pickDimensions(audience: Audience | undefined, specs: DimensionSpec[]) {
  if (!audience) return []
  return specs
    .map((spec) => ({ spec, items: audience[spec.key] ?? [] }))
    .filter((entry) => entry.items.length > 0)
}