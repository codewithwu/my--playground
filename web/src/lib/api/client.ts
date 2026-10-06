import { clearSecret, getSecret } from '../session'
import { CODE_AUTH_FAILED, ZhihuError } from './errors'
import { parseJson } from './parse'
import { creatorQueue, normalQueue } from './scheduler'
import { GLOBAL_SEARCH_LIMIT, ZHIHU_SEARCH_LIMIT } from './types'
import type {
  AccountStats,
  CommentPage,
  ContentDetail,
  ContentStats,
  Envelope,
  HotList,
  QuotaEntry,
  SearchResult,
} from './types'

const BASE = 'https://developer.zhihu.com'

type Bucket = 'creator' | 'normal'

interface RequestOptions {
  path: string
  query?: Record<string, string | number | undefined>
  /** creator 桶串行(并发 1),其余并发 4 */
  bucket?: Bucket
}

/**
 * 全部接口调用的唯一出口。
 * 职责:注入鉴权头 → 无损解析 → 拆信封 → 失败抛 ZhihuError。
 */
async function request<T>({ path, query, bucket = 'normal' }: RequestOptions): Promise<T> {
  const secret = getSecret()
  if (!secret) {
    throw new Error('尚未连接知乎开放平台')
  }

  const url = new URL(path, BASE)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const send = async (): Promise<T> => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secret}`,
        // 秒级 Unix 时间戳,服务端校验,与服务端相差不能超过 10 分钟
        'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
      },
    })

    const body = parseJson<Envelope<T>>(await response.text())

    if (body.Code !== 0) {
      // 凭据失效是全局状态:清掉凭据后 RequireSecret 会自动把用户送回门禁页,
      // 避免每个页面各写一套错误处理(必然有遗漏,遗漏处就是一片空白)。
      if (body.Code === CODE_AUTH_FAILED) {
        clearSecret()
      }
      throw new ZhihuError(body.Code, body.Message)
    }

    return body.Data as T
  }

  return bucket === 'creator' ? creatorQueue.run(send) : normalQueue.run(send)
}

/**
 * 额度查询。不消耗额度,所以用来做门禁校验和常驻额度条都是安全的。
 * ⚠️ 实测计数滞后约 3 分钟,界面必须标注「约」值。
 */
export function fetchQuota() {
  return request<QuotaEntry[]>({ path: '/api/v1/quota' })
}

/**
 * 账号创作数据。
 * ⚠️ 不要传 StartDate / EndDate —— 实测一传就返回全 0。
 */
export function fetchAccountStats() {
  return request<AccountStats>({
    path: '/api/v1/user/creator_account_stats',
    query: { ContentType: 'all' },
    bucket: 'creator',
  })
}

/* ── 切片 3:单篇内容钻取 ──
   三个接口都走 creator 桶(并发 1)。
   设计要求优先级 11 → 09 → 10:统计卡最先出现,其次正文,最后评论。
   实现上依赖「调用顺序即入队顺序」:React Query 的三个 hook 在同一次渲染里
   按代码顺序发起 fetch,调度器是 FIFO,所以天然就是这个顺序。
   之所以不用重试解决限流,是因为限流在源头(并发=1)已经被消除了。
*/

/**
 * 单篇创作数据。
 * ⚠️ 禁止传 StartDate / EndDate —— 实测一传就返回全 0。
 */
export function fetchContentStats(contentUrl: string) {
  return request<ContentStats>({
    path: '/api/v1/user/creator_content_stats',
    query: { ContentUrl: contentUrl },
    bucket: 'creator',
  })
}

/** 正文。Body 是不受信任的富文本,渲染前必须过 sanitize()。 */
export function fetchContentDetail(contentUrl: string) {
  return request<ContentDetail>({
    path: '/api/v1/user/content_detail',
    query: { ContentUrl: contentUrl },
    bucket: 'creator',
  })
}

/** 评论。分页必须按 Paging.NextOffset 推进,不能按本页条数推断。 */
export function fetchComments(contentUrl: string, offset = 0) {
  return request<CommentPage>({
    path: '/api/v1/user/content_comments',
    query: { ContentUrl: contentUrl, Offset: offset, Limit: 20 },
    bucket: 'creator',
  })
}

/* ── 切片 4:搜索与热榜 ──
   全部走 normal 桶(并发 4)。这两个桶每日各 5000 次额度,
   可以放心做防抖输入即搜(实测 zhihu_search / global_search 各 5000)。
   hot_list 每日只有 100 次,靠 5 分钟 TTL 缓存而不是靠限速。
*/

/** 知乎热榜。Limit 上限 30,超出自动截断。 */
export function fetchHotList(limit = 30) {
  return request<HotList>({ path: '/api/v1/content/hot_list', query: { Limit: limit } })
}

/**
 * 知乎站内搜索。
 * ⚠️ Count 上限实测为 10,超出静默截断,没有分页(HasMore 恒 false)。
 * ⚠️ SortBy 字段非法会返回 10001 'invalid SortBy field'。
 */
export function fetchZhihuSearch(query: string, sortBy = '') {
  return request<SearchResult>({
    path: '/api/v1/content/zhihu_search',
    query: { Query: query, Count: ZHIHU_SEARCH_LIMIT, ...(sortBy ? { SortBy: sortBy } : {}) },
  })
}

/**
 * 全网搜索。
 * ⚠️ Count 上限实测为 20。
 * ⚠️ Filter 不支持任何知乎域名,会返回 10001,并附带明确提示
 *    "use zhihu_search for Zhihu content" —— 所以站内内容一律走 03。
 * ⚠️ Filter 语法错误返回 10001 'invalid Filter expression'。
 */
export function fetchGlobalSearch(query: string, filter = '') {
  return request<SearchResult>({
    path: '/api/v1/content/global_search',
    query: { Query: query, Count: GLOBAL_SEARCH_LIMIT, ...(filter ? { Filter: filter } : {}) },
  })
}
