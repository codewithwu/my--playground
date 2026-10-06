import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/**
 * 空态。
 *
 * 之前各处都是一行灰字,和「还没加载出来」在视觉上分不开。
 * 加图标 + 更大的留白之后,能一眼看出是「确实没有」而不是「坏了」。
 */
export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm',
        className,
      )}
    >
      <Inbox className="text-muted-foreground/50 size-5" />
      <p>{children}</p>
    </div>
  )
}