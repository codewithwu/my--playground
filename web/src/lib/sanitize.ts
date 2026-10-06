import DOMPurify from 'dompurify'

/**
 * 全应用唯一的 HTML 消毒出口。
 *
 * 为什么必须有:09 的 `Body` 是知乎正文的富文本,10 的 `Content` 文档明确写
 * 「按不可信内容处理」。用户自己就能往正文里贴任意 HTML。
 * 密钥存在 sessionStorage 里,一次 XSS 就能拿走所有在线访客的 Access Secret。
 *
 * 实测 09 正文的标签只有 p / br / figure / blockquote / img / b,无 script、
 * iframe、on* 事件或 javascript:。但白名单是按「允许什么」写的,不是按
 * 「当前没出现什么」写的 —— 上游随时可能开始输出新标签。
 *
 * 关键细节:白名单必须包含 `figure` 并放行 `data-*` / `class`。
 * 知乎配图依赖 data-rawwidth / data-rawheight / data-original-token,
 * 剥掉这些属性图片会全部失真。实测正文有 12 张配图。
 */
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
    'blockquote', 'q', 'cite',
    'ul', 'ol', 'li',
    'code', 'pre', 'kbd', 'samp',
    'figure', 'figcaption', 'picture', 'source',
    'img', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'srcset', 'alt', 'title', 'class', 'id',
    'width', 'height', 'colspan', 'rowspan', 'target', 'rel',
  ],
  // 知乎配图依赖这些属性
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['script', 'iframe', 'style', 'form', 'object', 'embed', 'link', 'meta', 'base'],
  FORBID_ATTR: ['style', 'srcset'], // style 防止布局劫持
  ALLOW_UNKNOWN_PROTOCOLS: false,
}

// 外链一律新窗口打开并切断 opener 引用。
// 03/04/07 返回的都是外部站点链接,没有 noopener 的话对方页面
// 能通过 window.opener 反向操纵本页面 —— 这是最容易被漏掉的一条。
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
  if (node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy')
  }
})

/** 返回净化后的 HTML 字符串。这是唯一允许富文本进入 DOM 的路径。 */
export function sanitize(dirty: string | undefined | null): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, CONFIG)
}

/**
 * 搜索结果摘要专用。
 *
 * 实测 `ContentText` 是两种标记的混合体:
 *   - 文档声明高亮部分用 `<em>` 标签(HTML)
 *   - 实测正文里还夹着 `**粗体**`(markdown,不是 HTML)
 * 直接当纯文本渲染会看到一堆裸露的 `**`,所以先把 markdown 粗体转成
 * <strong>,再统一过一遍 DOMPurify —— 顺序不能反,转出来的标签同样要消毒。
 */
export function sanitizeSnippet(dirty: string | undefined | null): string {
  if (!dirty) return ''
  const withTags = dirty.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return DOMPurify.sanitize(withTags, CONFIG)
}
