import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

/**
 * 卡片。
 *
 * 现在只在**确实需要一个边界**的地方用:表单、输入区、长文正文。
 * 凡是并列的数据指标都改用发丝线分区(LedgerSection / LedgerBlock)——
 * 整页十几个一模一样的圆角盒子会让所有分组看起来同样重要。
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-card text-card-foreground rounded-lg border', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-medium tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}
