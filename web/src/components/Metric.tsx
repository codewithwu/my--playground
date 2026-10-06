import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface MetricProps {
  label: string
  value: ReactNode
  /** 次要说明,例如活跃率、取关数 */
  hint?: ReactNode
}

/**
 * 指标 —— 数字在上、标签在下。
 *
 * 之前每个指标都带一个图标。那是仪表盘模板的套路:图标并没有帮任何人
 * 更快地找到数字,只是把四行数字推得高低不齐。去掉之后同一横排的数字
 * 共用一条基线,这是"这是一页数字"最直接的表达。
 */
export function Metric({ label, value, hint }: MetricProps) {
  return (
    <div className="min-w-0">
      {/* 不加 tabular:等宽数字在大字号下会让 "121" 显得松垮。
         只有纵向对齐的数字列(表格行、坐标刻度)才需要等宽。 */}
      <p className="text-metric text-foreground">{value}</p>
      <p className="text-muted-foreground mt-1.5 text-sm">{label}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
    </div>
  )
}

/**
 * 指标带 —— 一排指标,上下各一条发丝线,格子之间是竖线。
 *
 * 竖线只在 lg 以上出现。窄屏是 2 列 × N 行,此时按行分隔就够了,
 * 再加竖线会在第一行中间凭空多出一条线。
 */
export function MetricBand({
  children,
  className,
  columns = 4,
}: {
  children: ReactNode
  className?: string
  /** lg 以上的列数。竖线数量跟着它走,格子数必须能整除 */
  columns?: 3 | 4
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-y-7 border-y border-border px-1 py-6',
        'lg:divide-x lg:divide-border lg:gap-y-0',
        columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
        className,
      )}
    >
      {/* divide-x 只画线不撑间距,内边距要自己给 */}
      {children}
    </div>
  )
}

/** MetricBand 里的格子 —— 负责 lg 上的左内边距。 */
export function MetricCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 lg:pl-7 lg:first:pl-0', className)}>{children}</div>
}

/**
 * 数据行 —— 左标签右数值,下面一条发丝线。
 *
 * 总览的「创作数量」、内容详情的次级指标、内容列表都用它。
 * 比卡片省事:同一组里的行天然对齐,不需要每个数字都套一个盒子。
 */
export function DataRow({
  label,
  value,
  className,
}: {
  label: ReactNode
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 border-b border-border py-2', className)}>
      <dt className="text-muted-foreground min-w-0 truncate text-sm">{label}</dt>
      <dd className="tabular text-foreground shrink-0 text-sm font-medium">{value}</dd>
    </div>
  )
}

/** `—` 用弱化色,让「没有数据」一眼可辨,而不是看起来像个 0。 */
export function MissingValue() {
  return <span className="text-muted-foreground">—</span>
}

/**
 * 涨跌数值。颜色只编码方向 —— 这是设计原则 2:
 * 颜色编码状态(增减/正常/出错),不编码身份。
 */
export function DeltaText({ children, positive }: { children: ReactNode; positive?: boolean }) {
  return (
    <span
      className={cn(
        'tabular',
        positive ? 'text-success' : positive === false ? 'text-destructive' : '',
      )}
    >
      {children}
    </span>
  )
}