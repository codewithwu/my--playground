import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchGlobalSearch, fetchZhihuSearch } from '../../lib/api/client'
import { describeError } from '../../lib/api/errors'
import { SORT_OPTIONS } from '../../lib/api/types'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { Alert } from '../../components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { PageHeader } from '../../components/layout/AppShell'
import { SearchResultList } from './SearchResultList'
import { HotList } from './HotList'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

type Mode = 'zhihu' | 'global'

/** 04 的发布时间过滤。值是 publish_time 起点(秒级 Unix),不加引号。 */
interface TimeRange {
  value: string
  label: string
  seconds: number
}

const TIME_RANGES: TimeRange[] = [
  { value: '', label: '不限时间', seconds: 0 },
  { value: 'one-day', label: '近一天', seconds: DAY },
  { value: 'one-week', label: '近一周', seconds: 7 * DAY },
  { value: 'one-month', label: '近一月', seconds: 30 * DAY },
]

export function DiscoverPage() {
  const [mode, setMode] = useState<Mode>('zhihu')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [range, setRange] = useState('')

  const debounced = useDebouncedValue(query.trim(), 500)
  const activeSeconds = TIME_RANGES.find((r) => r.value === range)?.seconds ?? 0

  // queryKey 里放稳定的 range 字符串,而不是时间戳。
  // 原因:时间戳如果在 render 里算,每次渲染都不同,会让 queryKey 一直变,
  // 于是每次重渲染都触发新的搜索请求。放进 queryFn 就没问题 ——
  // queryFn 是在 render 之外执行的,而且语义上更对:
  // 「近一周」指的是发起这次搜索时往前一周,不是页面渲染时往前一周。
  const searchQuery = useQuery({
    queryKey: ['search', mode, debounced, sortBy, range],
    queryFn: () => {
      if (mode === 'zhihu') return fetchZhihuSearch(debounced, sortBy)
      if (activeSeconds <= 0) return fetchGlobalSearch(debounced)
      const from = Math.floor(Date.now() / 1000) - activeSeconds
      return fetchGlobalSearch(debounced, `publish_time>${from}`)
    },
    enabled: debounced.length > 0,
    // 搜索结果时效性一般,给 5 分钟;命中同一查询时不再重复请求
    staleTime: 5 * MINUTE,
  })

  return (
    <div className="space-y-5 p-6 lg:p-8">
      <PageHeader
        title="发现"
        description="知乎热榜与站内、全网搜索。搜索会消耗你账号的搜索额度(各 5000 次/天)。"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>搜索</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === 'zhihu' ? '搜索知乎站内内容' : '搜索全网内容'}
              className="min-w-64 flex-1"
              aria-label="搜索关键词"
            />
            {query !== debounced ? (
              <span className="text-muted-foreground self-center text-xs">搜索中…</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-muted inline-flex rounded-md p-0.5">
              <ModeButton active={mode === 'zhihu'} onClick={() => setMode('zhihu')}>
                知乎站内
              </ModeButton>
              <ModeButton active={mode === 'global'} onClick={() => setMode('global')}>
                全网
              </ModeButton>
            </div>

            {mode === 'zhihu' ? (
              <Options
                options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={sortBy}
                onChange={setSortBy}
                label="排序"
              />
            ) : (
              <Options
                options={TIME_RANGES}
                value={range}
                onChange={setRange}
                label="时间"
              />
            )}

            <span className="text-muted-foreground ml-auto text-xs">
              {mode === 'zhihu' ? '最多 10 条' : '最多 20 条'} · 无分页
            </span>
          </div>
        </CardContent>
      </Card>

      {debounced.length === 0 ? null : searchQuery.isError ? (
        <Alert tone="destructive">{describeError(searchQuery.error)}</Alert>
      ) : (
        <SearchResultList
          isPending={searchQuery.isPending}
          items={searchQuery.data?.Items}
          emptyReason={searchQuery.data?.EmptyReason}
          hasMore={searchQuery.data?.HasMore}
        />
      )}

      <HotList />
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'bg-background rounded-[5px] px-3 py-1 text-sm font-medium shadow-xs'
          : 'text-muted-foreground rounded-[5px] px-3 py-1 text-sm hover:text-foreground'
      }
    >
      {children}
    </button>
  )
}

function Options({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground mr-1 text-xs">{label}</span>
      {options.map((option) => (
        <Button
          key={option.value || 'default'}
          size="sm"
          variant={value === option.value ? 'secondary' : 'ghost'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
