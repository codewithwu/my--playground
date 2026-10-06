import { Radar } from 'lucide-react'
import { cn } from '../lib/utils'

/**
 * 品牌标记。
 *
 * 页面上最大的一块饱和色 —— 整个布局里只有这一处和导航选中态是实心靛蓝,
 * 它就是「极小面积强调色」的锚点(index.css 顶部设计原则 1)。
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
        className,
      )}
    >
      <Radar className="size-4" />
    </div>
  )
}