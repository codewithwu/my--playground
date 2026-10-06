import type { AudienceContentItem, Interactions } from '../../lib/api/types'
import { contentUrl } from '../../lib/link'
import { formatCount } from '../../lib/format'
import { LedgerBlock, LedgerSection } from '../../components/Ledger'

/**
 * 互动区。数据来自 FollowerProfile.Interactions 和 FollowerProfile.Audience.Content,
 * 是这个接口里「谁在和你互动、哪篇内容带来了关注」的部分。
 * 文档没有明确三者的精确语义差异,所以标签按所在字段命名,不做过度解读。
 */
export function InteractionsSection({
  interactions,
  acquisition,
}: {
  interactions?: Interactions
  acquisition?: AudienceContentItem[]
}) {
  const creators = interactions?.Creators ?? []
  const content = interactions?.Content ?? []
  const acquired = acquisition ?? []

  if (creators.length === 0 && content.length === 0 && acquired.length === 0) {
    return null
  }

  return (
    <LedgerSection title="互动">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        {creators.length > 0 ? (
          <LedgerBlock title="互动创作者">
            <ul>
              {creators.map((creator) => (
                <li
                  key={creator.MemberToken}
                  className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
                >
                  {creator.Avatar ? (
                    <img
                      src={creator.Avatar}
                      alt=""
                      loading="lazy"
                      className="size-7 shrink-0 rounded-full"
                    />
                  ) : (
                    <div className="bg-muted size-7 shrink-0 rounded-full" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {creator.Name ?? <span className="text-muted-foreground">—</span>}
                  </span>
                  <span className="tabular text-muted-foreground shrink-0 text-xs">
                    {creator.FollowCount === undefined
                      ? '—'
                      : `${formatCount(creator.FollowCount)} 关注`}
                  </span>
                </li>
              ))}
            </ul>
          </LedgerBlock>
        ) : null}

        {content.length > 0 ? <ContentList title="互动内容" items={content} /> : null}

        {acquired.length > 0 ? <ContentList title="带来关注的内容" items={acquired} /> : null}
      </div>
    </LedgerSection>
  )
}

function ContentList({ title, items }: { title: string; items: AudienceContentItem[] }) {
  return (
    <LedgerBlock title={title}>
      <ul>
        {items.map((item) => (
          <li
            key={`${item.ContentType}-${item.ContentToken}`}
            className="flex items-baseline gap-3 border-b border-border py-2 last:border-b-0"
          >
            <a
              href={contentUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
              title={item.Title}
            >
              {item.Title ?? item.ContentType}
            </a>
            <span className="tabular text-muted-foreground shrink-0 text-xs">
              {item.FollowCount === undefined ? '—' : formatCount(item.FollowCount)}
            </span>
          </li>
        ))}
      </ul>
    </LedgerBlock>
  )
}