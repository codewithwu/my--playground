import type { ReactNode } from 'react'
import { Card, CardContent } from './ui/card'
import { cn } from '../lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  /** 次要说明,例如「昨日 +12」 */
  hint?: ReactNode
  className?: string
}

export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {/* tabular:等宽数字,让一列数字的位数对齐 */}
        <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

/** `—` 用弱化色,让「没有数据」一眼可辨,而不是看起来像个 0。 */
export function MissingValue() {
  return <span className="text-muted-foreground">—</span>
}

export function DeltaText({ children, positive }: { children: ReactNode; positive?: boolean }) {
  return (
    <span className={cn(positive ? 'text-success' : positive === false ? 'text-destructive' : '')}>
      {children}
    </span>
  )
}
