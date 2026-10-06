import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const TONES = {
  info: 'border-border bg-card text-card-foreground',
  warning: 'border-warning/30 bg-warning/5 text-foreground',
  destructive: 'border-destructive/30 bg-destructive/5 text-foreground',
} as const

export function Alert({
  className,
  tone = 'info',
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof TONES }) {
  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-md border p-4 text-sm', TONES[tone], className)}
      {...props}
    />
  )
}
