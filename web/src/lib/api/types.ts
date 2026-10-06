/**
 * 响应类型。字段依据**实测返回**而非文档表格 ——
 * 两者有出入的地方以实测为准,PLAN.md §2 有逐条记录。
 */

/** 统一信封。Code === 0 为成功,否则 Data 为 null。 */
export interface Envelope<T> {
  Code: number
  Message: string
  Data: T | null
}

export interface QuotaEntry {
  APIID: string
  APIName: string
  TotalQuota: number
  TotalUsed: number
  RemainingQuota: number
}

export interface AudienceProfileItem {
  Name: string
  Ratio?: number
  Count?: number
}

export interface AudienceContentItem {
  ContentType: string
  /** 可能超出安全整数范围,解析后为字符串。见 parse.ts */
  ContentToken: string
  Title?: string
  FollowCount?: number
}

export interface Audience {
  /** 实测取值:"normal" | "updating" */
  Status?: string
  /** 机器码,不是人类可读文案(实测值如 "dmp" / "normal")。不直接展示。 */
  Reason?: string
  Source?: AudienceProfileItem[]
  Activeness?: AudienceProfileItem[]
  ActiveTime?: AudienceProfileItem[]
  Gender?: AudienceProfileItem[]
  Age?: AudienceProfileItem[]
  Interest?: AudienceProfileItem[]
  Location?: AudienceProfileItem[]
  OS?: AudienceProfileItem[]
  Content?: AudienceContentItem[]
}

/**
 * 账号维度指标。实测确认:**不含** ClickRate / ReadFinishedRate /
 * FollowerConversionRate / PositiveInteractionRate —— 那些只在单篇接口(11)里,
 * 且本账号连单篇的比例字段也多数不返回。不要为它们预留 UI。
 */
export interface Metrics {
  /** 数据新鲜度,实测形如 "2026-10-06 09:57:53" */
  Updated?: string
  ViewCount?: number
  PlayCount?: number
  UpvoteCount?: number
  CommentCount?: number
  LikeCount?: number
  CollectCount?: number
  ShareCount?: number
  RepinCount?: number
  PublishCount?: number
  IncreasedUpvoteCount?: number
  DecreasedUpvoteCount?: number
  IncreasedLikeCount?: number
  DecreasedLikeCount?: number
  Today?: Metrics
  Yesterday?: Metrics
}

export interface Followers {
  Total?: number
  Yesterday?: number
  NewYesterday?: number
  CancelledYesterday?: number
  ActiveCount?: number
  /** String 类型且已带百分号(实测 "50.3%"),必须原样透传 */
  ActiveRatio?: string
}

export interface CreationCounts {
  Answer?: number
  Article?: number
  Video?: number
  Follower?: number
}

export interface InteractionCreator {
  Avatar?: string
  MemberToken?: string
  Name?: string
  FollowCount?: number
}

export interface Interactions {
  /** Int32。实测值 1 */
  Status?: number
  Creators?: InteractionCreator[]
  Content?: AudienceContentItem[]
}

export interface FollowerProfile {
  Status?: number
  Audience?: Audience
  Interactions?: Interactions
}

export interface AccountStats {
  ContentType?: string
  Metrics?: Metrics
  Audience?: Audience
  CreationCounts?: CreationCounts
  Followers?: Followers
  FollowerProfile?: FollowerProfile
}

/** 本应用实际使用的 4 个额度桶。实测每日额度见 PLAN.md §2.2。 */
export type QuotaBucketId = 'creator' | 'hot_list' | 'zhihu_search' | 'global_search'

export const USED_BUCKETS: QuotaBucketId[] = [
  'creator',
  'hot_list',
  'zhihu_search',
  'global_search',
]

/* ── 切片 3:单篇内容钻取 ── */

/**
 * 单篇指标(接口 11)。
 * ⚠️ 实测本账号不返回 ClickRate / ReadFinishedRate,不要为它们预留 UI。
 * ⚠️ 调用时禁止传 StartDate / EndDate —— 实测一传就返回全 0(PLAN.md §2.5)。
 */
export interface ContentMetrics {
  ViewCount?: number
  PlayCount?: number
  UpvoteCount?: number
  CommentCount?: number
  LikeCount?: number
  CollectCount?: number
  ShareCount?: number
  RepinCount?: number
  PageShowUV?: number
  NewFollowerCount?: number
  FollowerGain?: number
  FollowerConversionRate?: number
  /** String 类型且已带百分号(实测 "0.31%"),原样透传 */
  PositiveInteractionRate?: string
  Today?: ContentMetrics
  Yesterday?: ContentMetrics
}

export interface ContentStatsItem {
  ContentType: string
  ContentToken: string
  Url?: string
  Title?: string
  Metrics?: ContentMetrics
  Audience?: Audience
}

/** 接口 11 的 Data 是对象而非数组:Data.Items */
export interface ContentStats {
  Items?: ContentStatsItem[]
}

/** 接口 09 的正文。Body 是不受信任的富文本。 */
export interface ContentDetail {
  ContentType?: string
  ContentToken?: string
  Url?: string
  /** 可能为空字符串 */
  Title?: string
  /** 可能包含 HTML,渲染前必须过 sanitize() */
  Body?: string
}

export interface Comment {
  /** Int64,文档要求保留精度 */
  ID: number | string
  Type?: string
  ReplyID?: number | string
  RootID?: number | string
  /** 秒级 Unix 时间戳 */
  CreatedAt?: number
  /** 不受信任的富文本 */
  Content?: string
  LikeCount?: number
  DislikeCount?: number
  /** 实测是 member token(如 "moreyu"),不是可读的昵称 */
  AuthorToken?: string
}

export interface CommentNode {
  Comment: Comment
  Children?: Comment[]
}

export interface Paging {
  IsEnd?: boolean
  NextOffset?: number
  Totals?: number
}

export interface CommentPage {
  Items?: CommentNode[]
  Paging?: Paging
}

/* ── 切片 4:搜索与热榜 ── */

/**
 * 03 与 04 的条目字段**完全相同**(实测逐字段比对,差集为空)。
 * 文档说 04 没有 RankingScore,实测是有的。
 */
export interface SearchItem {
  Title?: string
  ContentType?: string
  /** 实测是字符串,且**可能为负**(如 "-6094030487240244101") */
  ContentID?: string
  /** 摘要片段。混合了 <em> 高亮(HTML)和 **粗体**(markdown)两种标记 */
  ContentText?: string
  Url?: string
  CommentCount?: number
  VoteUpCount?: number
  AuthorName?: string
  AuthorAvatar?: string
  AuthorBadge?: string
  AuthorBadgeText?: string
  /** 秒级 Unix 时间戳 */
  EditTime?: number
  AuthorityLevel?: string
  RankingScore?: number
  CommentInfoList?: { Content?: string }[]
}

export interface SearchResult {
  /** 实测恒为 false —— 03/04 都没有分页 */
  HasMore?: boolean
  SearchHashId?: string
  /** 区间过滤把结果全滤掉时出现,实测值 "无相关内容" */
  EmptyReason?: string
  Items?: SearchItem[]
}

/** 03 的排序方式。文档未给枚举,以下都是实测通过的。 */
export const SORT_OPTIONS = [
  { value: '', label: '默认' },
  { value: 'EditTime:desc', label: '最新编辑' },
  { value: 'EditTime:asc', label: '最早编辑' },
  { value: 'VoteUpCount:desc', label: '最多点赞' },
  { value: 'CommentCount:desc', label: '最多评论' },
] as const

/** 03 的 Count 上限实测为 10;04 为 20。 */
export const ZHIHU_SEARCH_LIMIT = 10
export const GLOBAL_SEARCH_LIMIT = 20

export interface HotListItem {
  Title?: string
  Url?: string
  /** 实测存在空字符串的情况 */
  ThumbnailUrl?: string
  /** 实测存在空字符串的情况 */
  Summary?: string
}

export interface HotList {
  /** 实测等于实际返回条数 */
  Total?: number
  Items?: HotListItem[]
}
