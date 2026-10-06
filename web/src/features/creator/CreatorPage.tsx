import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { fetchAccountStats } from '../../lib/api/client'
import { describeError } from '../../lib/api/errors'
import type { AudienceContentItem } from '../../lib/api/types'
import { formatCount } from '../../lib/format'
import { cleanUrl, contentUrl } from '../../lib/link'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import { PageHeader } from '../../components/layout/AppShell'
import { ContentDetail } from './ContentDetail'

const MINUTE = 60 * 1000

export function CreatorPage() {
  const [selected, setSelected] = useState<string | null>(null)

  if (selected) {
    return <ContentDetail contentUrl={selected} onBack={() => setSelected(null)} />
  }
  return <ContentPicker onSelect={setSelected} />
}

/**
 * 钻取入口。
 *
 * 接口里**没有「列出我的所有内容」这个能力** —— 11/09/10 都必须传 ContentUrl。
 * 所以可选内容只能来自账号数据里已知的链接(互动内容 + 带来关注的内容),
 * 其余靠用户粘贴。切片 0 之前的设想「列出全部作品」是不存在的接口。
 */
function ContentPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  // 与总览共用同一个 queryKey,数据已经在缓存里,不会重复消耗 creator 额度
  const statsQuery = useQuery({
    queryKey: ['accountStats'],
    queryFn: fetchAccountStats,
    staleTime: 30 * MINUTE,
  })

  const profile = statsQuery.data?.FollowerProfile
  const known = useMemo(() => {
    const all = [...(profile?.Interactions?.Content ?? []), ...(profile?.Audience?.Content ?? [])]
    const seen = new Set<string>()
    return all.filter((item) => {
      const key = `${item.ContentType}-${item.ContentToken}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [profile])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = input.trim()
    if (!value) return
    if (!/^https?:\/\/[^/]*zhihu\.com\//i.test(value)) {
      setInputError('请填写知乎内容链接(zhihu.com)')
      return
    }
    setInputError(null)
    onSelect(value)
  }

  return (
    <div className="space-y-5 p-6 lg:p-8">
      <PageHeader
        title="我的创作"
        description="查看单篇内容的指标、正文和评论。知乎开放平台没有「列出全部作品」的接口,所以这里列出的是账号数据中已知的链接,其余请粘贴内容链接。"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>粘贴内容链接</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                setInputError(null)
              }}
              placeholder="https://www.zhihu.com/answer/..."
              className="font-mono text-xs"
              aria-label="内容链接"
            />
            <Button type="submit" disabled={!input.trim()}>
              查看
            </Button>
          </form>
          <p className="text-muted-foreground mt-2 text-xs">
            支持 /answer/、/p/、/pin/、/zvideo/ 路径。仅支持你自己已发布的内容。
          </p>
          {inputError ? (
            <p className="text-destructive mt-2 text-xs">{inputError}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>账号数据中已知的内容</CardTitle>
        </CardHeader>
        <CardContent>
          {statsQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : statsQuery.isError ? (
            <Alert tone="destructive">{describeError(statsQuery.error)}</Alert>
          ) : known.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              账号数据里暂无可钻取的内容。直接粘贴一条内容链接即可。
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {known.map((item) => (
                <KnownContentRow
                  key={`${item.ContentType}-${item.ContentToken}`}
                  item={item}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KnownContentRow({
  item,
  onSelect,
}: {
  item: AudienceContentItem
  onSelect: (url: string) => void
}) {
  const href = contentUrl(item)
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.Title}>
          {item.Title ?? '未命名内容'}
        </p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          <span className="rounded border px-1 py-px text-[10px] uppercase">
            {item.ContentType}
          </span>
          {item.FollowCount === undefined ? null : (
            <span className="tabular">{formatCount(item.FollowCount)} 关注</span>
          )}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onSelect(href)}>
        查看
      </Button>
      <a
        href={cleanUrl(href)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground"
        aria-label="在知乎打开"
      >
        <ExternalLink className="size-4" />
      </a>
    </li>
  )
}
