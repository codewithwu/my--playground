import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { USED_BUCKETS, type QuotaEntry } from '../lib/api/types'
import { formatCount } from '../lib/format'
import { cn } from '../lib/utils'

/** 额度条紧张时的提示阈值。PLAN.md §5.4 */
const LOW_RATIO = 0.1

/**
 * 额度面板。
 *
 * ⚠️ 只提示、不拦截 —— 这是对 PLAN.md §5.4 的一处有意偏离。
 * 计划原文是「低于阈值时主动停止发起该类请求」,但实测发现额度计数
 * 严重滞后:32 次调用的探测,消耗显示为 0。拿一个滞后的计数器去做硬拦截,
 * 会在额度明明还够的时候把用户挡在门外。所以这里只做视觉提示,
 * 真正撞上限时由接口返回 30002 兜底。
 */
export function QuotaMeter({ entries }: { entries: QuotaEntry[] }) {
  const byId = new Map(entries.map((entry) => [entry.APIID, entry]))
  const used = USED_BUCKETS.map((id) => byId.get(id)).filter(
    (entry): entry is QuotaEntry => entry !== undefined,
  )

  if (used.length === 0) return null

  const low = used.filter((entry) => {
    const total = entry.TotalQuota
    return total > 0 && entry.RemainingQuota / total <= LOW_RATIO
  })
  const lowNames = low.map((entry) => entry.APIName).join('、')

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between gap-2 space-y-0">
        <CardTitle>今日额度(约)</CardTitle>
        <span className="text-muted-foreground text-xs">计数有延迟,仅供参考</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {low.length > 0 ? (
          <p className="text-warning bg-warning/10 rounded-md px-3 py-2 text-xs">
            {lowNames}额度即将耗尽,继续使用可能触发「今日额度已用尽」。
          </p>
        ) : null}

        {used.map((entry) => {
          const total = entry.TotalQuota || 1
          const ratio = Math.max(0, Math.min(1, entry.RemainingQuota / total))
          const isLow = low.includes(entry)
          return (
            <div key={entry.APIID}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{entry.APIName}</span>
                <span className="tabular shrink-0 text-muted-foreground">
                  {formatCount(entry.RemainingQuota)} / {formatCount(entry.TotalQuota)}
                </span>
              </div>
              <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width]',
                    isLow ? 'bg-destructive' : 'bg-primary',
                  )}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
