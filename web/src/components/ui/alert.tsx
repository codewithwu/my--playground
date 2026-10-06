import { CircleAlert, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'info' | 'warning' | 'destructive'

const TONES: Record<Tone, { box: string; icon: LucideIcon; tint: string }> = {
  info: {
    box: 'border-border bg-card text-card-foreground',
    icon: Info,
    tint: 'text-muted-foreground',
  },
  // 5% 淡化在深色底上完全不可见,10% 是暗色下的下限
  warning: {
    box: 'border-warning/40 bg-warning/10 text-foreground',
    icon: TriangleAlert,
    tint: 'text-warning',
  },
  destructive: {
    box: 'border-destructive/40 bg-destructive/10 text-foreground',
    icon: CircleAlert,
    tint: 'text-destructive',
  },
}

/**
 * 状态提示。
 *
 * 图标一律由组件内部注入 —— 原来的 `flex gap-3` 就是给它留的位置,
 * 但一直没放,导致报错和正常内容长得一模一样。
 */
export function Alert({
  className,
  tone = 'info',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  const { box, icon: Icon, tint } = TONES[tone]
  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-md border p-4 text-sm', box, className)}
      {...props}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', tint)} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}