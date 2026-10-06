import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/**
 * 分区 —— 标题压一条发丝线,下面是内容。
 *
 * 这是整个布局的基本骨架:原来每个数据组都是一张带边框带圆角的卡片,
 * 一屏下来十几个一模一样的盒子,彼此的权重差异完全看不出来。现在权重
 * 由标题字号和上下留白表达,盒子只留给真正需要边界的东西(表单、
 * 长文正文)。
 */
export function LedgerSection({
  title,
  note,
  action,
  children,
  className,
}: {
  title: ReactNode
  /** 标题右侧的说明文字 */
  note?: ReactNode
  /** 标题右侧的操作 */
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {note ? <span className="text-muted-foreground text-sm">{note}</span> : null}
        {action}
      </header>
      {children}
    </section>
  )
}

/**
 * 账本块 —— 「小标题 / 发丝线 / 数据行」。
 *
 * 受众画像的每个维度、额度的每个桶都是这个形状。多列排布时块与块之间
 * 靠网格间距分开,不再各自套一个卡片。
 */
export function LedgerBlock({
  title,
  trailing,
  children,
  className,
}: {
  title: ReactNode
  trailing?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
        {/* 标题可能比尾部数值长得多(额度面板的接口名尤其长),
            截断标题而不是挤走数字 */}
        <h3 className="min-w-0 truncate text-sm font-medium">{title}</h3>
        {trailing ? (
          <span className="tabular text-muted-foreground shrink-0 text-xs">{trailing}</span>
        ) : null}
      </div>
      <div className="pt-1">{children}</div>
    </div>
  )
}