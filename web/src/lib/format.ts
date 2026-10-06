/**
 * 数字展示的唯一出口。PLAN.md §2.6 §2.7 §7.3。
 *
 * 核心规则:缺失一律 `—`,绝不用 0 代替。
 * 文档明令「可选数值指标未返回时不应补零;已提供的数值为 0 时会保留」——
 * 一旦把缺失画成 0,「没人看」和「数据没取到」就变得无法区分。
 */

export const MISSING = '—'

/** 计数。超安全范围的整数解析后是字符串,原样显示。 */
export function formatCount(value?: number | string | null): string {
  if (value === undefined || value === null) return MISSING
  if (typeof value === 'string') return value
  return value.toLocaleString('zh-CN')
}

/**
 * Float64 比例。实测 Audience[].Ratio 是 0-1 分数
 * (同一数组各项之和 ≈ 1.0),所以可以安全 ×100。
 */
export function formatRatio(ratio?: number | null): string {
  if (ratio === undefined || ratio === null) return MISSING
  return `${(ratio * 100).toFixed(1)}%`
}

/**
 * String 型比例。实测已带百分号("50.3%" / "0.31%"),
 * 文档也明令「沿用上游原值」——所以原样透传,不做任何解析或再格式化。
 */
export function formatRate(rate?: string | null): string {
  if (!rate) return MISSING
  return rate
}

/** 带正负号的增量,用于「昨日 +12 / -3」这类展示。 */
export function formatDelta(value?: number | null): string {
  if (value === undefined || value === null) return MISSING
  if (value > 0) return `+${value.toLocaleString('zh-CN')}`
  return value.toLocaleString('zh-CN')
}

/** 受众画像状态码 → 用户可读文案。Reason 是机器码(如 "dmp"),不展示。 */
export function describeAudienceStatus(status?: string | null): string {
  switch (status) {
    case 'normal':
      return '正常'
    case 'updating':
      return '数据更新中'
    case undefined:
    case null:
      return MISSING
    default:
      return '暂不可用'
  }
}

/** "2026-10-06 09:57:53" → "10-06 09:57" */
export function formatUpdated(updated?: string | null): string {
  if (!updated) return MISSING
  const match = updated.match(/^\d{4}-(\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  return match ? `${match[1]} ${match[2]}` : updated
}

/** 秒级 Unix 时间戳 → "2026-10-06 09:57"。 */
export function formatTimestamp(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) return MISSING
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return MISSING
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
