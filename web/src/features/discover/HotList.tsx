import { useQuery } from '@tanstack/react-query'
import { fetchHotList } from '../../lib/api/client'
import { describeError } from '../../lib/api/errors'
import { cleanUrl } from '../../lib/link'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { PageHeader } from '../../components/layout/AppShell'

const MINUTE = 60 * 1000

/**
 * 知乎热榜。
 *
 * hot_list 每日只有 100 次额度,所以靠 5 分钟 TTL 缓存而不是靠省请求。
 * 手动刷新按钮用的是 refetch(用户显式触发),不算自动轮询。
 *
 * 实测:Limit 上限 30,超出静默截断;ThumbnailUrl 和 Summary 都可能是空字符串。
 */
export function HotList() {
  const query = useQuery({
    queryKey: ['hotList'],
    queryFn: () => fetchHotList(30),
    staleTime: 5 * MINUTE,
  })

  const items = query.data?.Items ?? []

  return (
    <section className="space-y-3">
      <PageHeader
        title="知乎热榜"
        description={
          <span className="flex items-center gap-2">
            {query.data?.Total ? `共 ${query.data.Total} 条` : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="h-6 px-2 text-xs"
            >
              {query.isFetching ? '刷新中…' : '刷新'}
            </Button>
          </span>
        }
      />

      {query.isError ? (
        <Alert tone="destructive">{describeError(query.error)}</Alert>
      ) : query.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <ol className="grid gap-3 md:grid-cols-2">
          {items.map((item, index) => (
            <li key={`${item.Url}-${index}`}>
              <Card>
                <CardContent className="flex gap-3 p-4">
                  <span className="tabular text-muted-foreground w-6 shrink-0 pt-0.5 text-lg font-semibold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={cleanUrl(item.Url ?? '#')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary line-clamp-2 text-sm leading-snug font-medium underline-offset-4 hover:underline"
                    >
                      {item.Title || '无标题'}
                    </a>
                    {/* 实测 ThumbnailUrl / Summary 都可能是空字符串 */}
                    {item.Summary ? (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">
                        {item.Summary}
                      </p>
                    ) : null}
                  </div>
                  {item.ThumbnailUrl ? (
                    <img
                      src={item.ThumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="size-12 shrink-0 rounded object-cover"
                    />
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
