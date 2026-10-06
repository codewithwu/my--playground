import type { AudienceProfileItem } from '../../lib/api/types'
import { formatCount, formatRatio } from '../../lib/format'

/**
 * 分布条。
 *
 * 不用图表库:这些数据是 100% 分布,每一项都直接对应一个百分比宽度,
 * 用 div 画比任何图表库都准,而且自动继承设计令牌、零额外依赖。
 *
 * ⚠️ Count 的语义在不同维度之间不可比 —— 读者画像的 Source.Count 是
 * 人次(实测合计 10,962,927),粉丝画像的 Gender.Count 是人数(合计 1294)。
 * 所以 Count 只在同一维度内展示,绝不跨维度求和或比较。
 */
export function DistributionBars({
  items,
  max = 10,
}: {
  items: AudienceProfileItem[]
  /** 最多显示多少项,其余折叠 */
  max?: number
}) {
  if (items.length === 0) return <EmptyDistribution />

  const visible = items.slice(0, max)
  const hidden = items.length - visible.length
  // 以最大项为 100% 宽度,否则小占比的项会挤成看不见的一条线
  const peak = Math.max(...visible.map((item) => item.Ratio ?? 0), 0.0001)

  return (
    <div className="space-y-2.5">
      {visible.map((item) => {
        const ratio = item.Ratio ?? 0
        return (
          <div key={item.Name} className="grid grid-cols-[6rem_1fr_9rem] items-center gap-3">
            <span className="truncate text-sm" title={item.Name}>
              {item.Name}
            </span>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${(ratio / peak) * 100}%` }}
              />
            </div>
            <span className="tabular text-muted-foreground text-right text-xs">
              {formatRatio(ratio)}
              {item.Count === undefined ? '' : ` · ${formatCount(item.Count)}`}
            </span>
          </div>
        )
      })}
      {hidden > 0 ? (
        <p className="text-muted-foreground pl-[6.75rem] text-xs">另有 {hidden} 项未显示</p>
      ) : null}
    </div>
  )
}

/** 24 小时活跃时段。这是接口里唯一接近时间序列的数据(PLAN.md §2.4)。 */
export function ActiveTimeChart({ items }: { items: AudienceProfileItem[] }) {
  if (items.length === 0) return <EmptyDistribution />

  // 按小时名排序,避免依赖接口返回顺序
  const sorted = [...items].sort((a, b) => a.Name.localeCompare(b.Name))
  const peak = Math.max(...sorted.map((item) => item.Ratio ?? 0), 0.0001)
  const best = sorted.reduce((a, b) => ((b.Ratio ?? 0) > (a.Ratio ?? 0) ? b : a))

  return (
    <div className="space-y-3">
      <div className="flex h-24 items-end gap-[3px]">
        {sorted.map((item) => {
          const ratio = item.Ratio ?? 0
          const isPeak = item.Name === best.Name
          return (
            <div
              key={item.Name}
              className="group flex h-full flex-1 flex-col justify-end"
              title={`${item.Name} · ${formatRatio(ratio)}${item.Count === undefined ? '' : ` · ${formatCount(item.Count)}`}`}
            >
              <div
                className={
                  isPeak
                    ? 'bg-primary rounded-t-[2px]'
                    : 'bg-primary/35 group-hover:bg-primary/60 rounded-t-[2px]'
                }
                style={{ height: `${Math.max((ratio / peak) * 100, 2)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="text-muted-foreground flex justify-between text-[10px]">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
      <p className="text-muted-foreground text-xs">
        最活跃时段 <span className="tabular text-foreground font-medium">{best.Name}</span>,占比{' '}
        <span className="tabular">{formatRatio(best.Ratio)}</span>
      </p>
    </div>
  )
}

function EmptyDistribution() {
  return <p className="text-muted-foreground py-4 text-sm">该维度暂无数据</p>
}
