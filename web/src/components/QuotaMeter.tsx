import { USED_BUCKETS, type QuotaEntry } from '../lib/api/types'
import { formatCount } from '../lib/format'
import { LedgerBlock, LedgerSection } from './Ledger'

/** 额度条紧张时的提示阈值。 */
const LOW_RATIO = 0.1

/**
 * 额度面板。
 *
 * ⚠️ 只提示、不拦截 —— 这是对计划原文「低于阈值时主动停止发起该类请求」
 * 的一处有意偏离。实测发现额度计数严重滞后:32 次调用的探测,消耗显示为 0。
 * 拿一个滞后的计数器去做硬拦截,会在额度明明还够的时候把用户挡在门外。
 * 所以这里只做视觉提示,真正撞上限时由接口返回 30002 兜底。
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
    <LedgerSection title="今日额度" note="计数有延迟,仅供参考">
      {low.length > 0 ? (
        <p className="border-warning/40 bg-warning/10 text-foreground rounded-md border px-3 py-2 text-sm">
          {lowNames}额度即将耗尽,继续使用可能触发「今日额度已用尽」。
        </p>
      ) : null}

      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {used.map((entry) => (
          <LedgerBlock
            key={entry.APIID}
            title={entry.APIName}
            trailing={`${formatCount(entry.RemainingQuota)} / ${formatCount(entry.TotalQuota)}`}
          >
            {/* 底槽用比填充色更浅的一档 —— 这样"剩多少"是整条都能读出来的,
                而不是只剩中间那段有颜色。紧张时整条转红。 */}
            <div
              className={
                low.includes(entry)
                  ? 'bg-destructive/15 mt-2.5 h-1.5 overflow-hidden rounded-full'
                  : 'bg-primary/15 mt-2.5 h-1.5 overflow-hidden rounded-full'
              }
            >
              <div
                className={
                  low.includes(entry)
                    ? 'bg-destructive h-full rounded-full transition-[width] duration-300'
                    : 'bg-primary h-full rounded-full transition-[width] duration-300'
                }
                style={{
                  width: `${Math.max(0, Math.min(1, entry.RemainingQuota / (entry.TotalQuota || 1))) * 100}%`,
                }}
              />
            </div>
          </LedgerBlock>
        ))}
      </div>
    </LedgerSection>
  )
}