import { useQuery } from '@tanstack/react-query'
import { fetchHotList } from '../../lib/api/client'
import { describeError } from '../../lib/api/errors'
import { cleanUrl } from '../../lib/link'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { LedgerSection } from '../../components/Ledger'
import { cn } from '../../lib/utils'

const MINUTE = 60 * 1000

/**
 * 知乎热榜。
 *
 * hot_list 每日只有 100 次额度,所以靠 5 分钟 TTL 缓存而不是靠省请求。
 * 手动刷新按钮用的是 refetch(用户显式触发),不算自动轮询。
 *
 * 实测:Limit 上限 30,超出静默截断;ThumbnailUrl 和 Summary 都可能是空字符串。
 *
 * 排成一列而不是两列卡片:热榜是**有序序列**,用户是顺着名次往下扫的,
 * 单列发丝线列表让名次连续;两列卡片会把 1、2 放到第一行、3、4 放到第二行,
 * 名次一断,扫读就失效了。
 */
export function HotList() {
  const query = useQuery({
    queryKey: ['hotList'],
    queryFn: () => fetchHotList(30),
    staleTime: 5 * MINUTE,
  })

  const items = query.data?.Items ?? []

  return (
    <LedgerSection
      title="知乎热榜"
      note={query.data?.Total ? `共 ${query.data.Total} 条` : undefined}
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? '刷新中' : '刷新'}
        </Button>
      }
    >
      {query.isError ? (
        <Alert tone="destructive">{describeError(query.error)}</Alert>
      ) : query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">热榜暂时取不到内容。</p>
      ) : (
        <ol>
          {items.map((item, index) => (
            <li
              key={`${item.Url}-${index}`}
              className="flex items-start gap-4 border-b border-border py-3 last:border-b-0"
            >
              {/* 前三是真热门,用强调色;其余压成灰。名次本身就是排序信号,
                  不需要靠颜色再强调一遍。 */}
              <span
                className={cn(
                  'tabular w-6 shrink-0 text-right text-lg leading-6',
                  index < 3 ? 'text-primary font-semibold' : 'text-muted-foreground',
                )}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <a
                  href={cleanUrl(item.Url ?? '#')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary line-clamp-2 text-sm leading-snug underline-offset-4 hover:underline"
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
                  className="size-14 shrink-0 rounded object-cover"
                />
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </LedgerSection>
  )
}