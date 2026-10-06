import type { AudienceProfileItem } from '../../lib/api/types'
import { formatCount, formatRatio } from '../../lib/format'
import { EmptyState } from '../EmptyState'

/**
 * 分布条。
 *
 * 不用图表库:这些数据是 100% 分布,每一项都直接对应一个百分比宽度,
 * 用 div 画比任何图表库都准,而且自动继承设计令牌、零额外依赖。
 *
 * 形状规格:条高 8px(远低于 24px 上限),基线端是直角、只有数据末端
 * 圆 4px —— 从零点长出来的量,根部和头部的圆角不该一样。
 *
 * 刻意不画底槽。之前每行都有一个灰色圆角长条做背景,七八个维度堆下来
 * 屏幕上多了五六十个灰盒子,却没带来任何信息 —— 数值本来就印在旁边,
 * 条长本身也已经在表达比例。去掉底槽,条直接躺在页面底色上。
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
    <div className="space-y-1.5">
      {visible.map((item) => (
        <DistributionRow
          key={item.Name}
          item={item}
          width={`${((item.Ratio ?? 0) / peak) * 100}%`}
        />
      ))}
      {hidden > 0 ? (
        <p className="text-muted-foreground pt-1 text-xs">另有 {hidden} 项未显示</p>
      ) : null}
    </div>
  )
}

function DistributionRow({ item, width }: { item: AudienceProfileItem; width: string }) {
  return (
    <div
      /* 数值列用 auto 而不是固定像素:Count 最长能到七位数
         (实测读者画像单项可达 600 万+),定宽会把数字挤到换行。
         auto 让这一列按内容定尺寸,名字那列吃掉剩下的。 */
      className="grid grid-cols-[minmax(0,1fr)_minmax(2.5rem,5rem)_auto] items-center gap-x-3 py-1"
      title={item.Name}
    >
      <span className="truncate text-sm">{item.Name}</span>
      <div className="flex h-2 items-center">
        <div className="bg-primary h-2 rounded-r-[4px]" style={{ width }} />
      </div>
      <span className="flex items-baseline justify-end gap-2 whitespace-nowrap">
        <span className="tabular text-sm">{formatRatio(item.Ratio)}</span>
        {item.Count === undefined ? null : (
          <span className="tabular text-muted-foreground text-xs">{formatCount(item.Count)}</span>
        )}
      </span>
    </div>
  )
}

/** 24 小时活跃时段。这是接口里唯一接近时间序列的数据。 */
export function ActiveTimeChart({ items }: { items: AudienceProfileItem[] }) {
  if (items.length === 0) return <EmptyDistribution />

  // 按小时名排序,避免依赖接口返回顺序
  const sorted = [...items].sort((a, b) => a.Name.localeCompare(b.Name))
  const peak = Math.max(...sorted.map((item) => item.Ratio ?? 0), 0.0001)
  const best = sorted.reduce((a, b) => ((b.Ratio ?? 0) > (a.Ratio ?? 0) ? b : a))

  return (
    <div className="space-y-3">
      {/* 容器高度包含横轴文字带 —— 只给绘图区定高会让轴标签挤出去。
          柱子之间留 2px 空隙,颜色不能区分时靠这道缝区分。 */}
      <div className="flex h-28 items-end gap-[2px]">
        {sorted.map((item) => {
          const ratio = item.Ratio ?? 0
          const isPeak = item.Name === best.Name
          return (
            <div
              key={item.Name}
              tabIndex={0}
              className="group relative flex h-full flex-1 cursor-default flex-col justify-end outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={`${item.Name} 占 ${formatRatio(ratio)}${item.Count === undefined ? '' : `,${formatCount(item.Count)} 人`}`}
            >
              {/* 悬停/聚焦时浮出数值。这张图没有表格孪生体,
                  所以不能只靠 title 属性把值藏起来。 */}
              <span
                className="text-card pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded border px-1.5 py-0.5 text-micro whitespace-nowrap opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {item.Name} · {formatRatio(ratio)}
              </span>
              {/* 峰值是唯一被强调的一根:石墨灰里的一根靛蓝。
                  强调只此一处,其余 23 根一律灰 —— 这是设计原则 1。 */}
              <div
                className={
                  isPeak ? 'bg-primary rounded-t-[4px]' : 'bg-muted-foreground/35 rounded-t-[4px]'
                }
                style={{ height: `${Math.max((ratio / peak) * 100, 1.5)}%` }}
              />
            </div>
          )
        })}
      </div>

      <div className="text-muted-foreground flex justify-between text-micro">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>

      <p className="text-muted-foreground text-xs">
        最活跃时段 <span className="text-foreground font-medium">{best.Name}</span>,占比{' '}
        <span className="tabular">{formatRatio(best.Ratio)}</span>
      </p>
    </div>
  )
}

function EmptyDistribution() {
  return <EmptyState className="py-6">该维度暂无数据</EmptyState>
}