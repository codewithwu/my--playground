import { isLosslessNumber, parse } from 'lossless-json'

/**
 * 无损 JSON 解析。
 *
 * 文档在 09/10/11/12 四处要求「客户端应保留大整数精度」,理由是原生
 * JSON.parse 会把超过 2^53 的整数静默算错 —— 实测
 * JSON.parse('{"t":2080224622985883822}').t 确实变成不可逆的错误值。
 *
 * 但实测这个 API 目前并不会发出裸的大整数:ContentToken 直接以字符串返回
 * ("2080224622985883822"),URL 里的大数字位于字符串内部。
 * 所以这一层是**防御性**的,不是当前必需的。
 *
 * 策略:安全整数和小数正常返回 number;超出安全范围的整数保留为字符串。
 * 这样即使上游将来改变序列化方式,也不会静默产生错误链接或错误计数。
 */
function reviver(_key: string, value: unknown): unknown {
  if (isLosslessNumber(value)) {
    const text = value.value
    const asNumber = Number(text)
    // 小数用 double 承载不会丢精度,所以照常返回 number;
    // 只有「大到装不进 double 的整数」才降级为字符串。
    if (Number.isInteger(asNumber) && !Number.isSafeInteger(asNumber)) {
      return text
    }
    return asNumber
  }
  return value
}

export function parseJson<T>(text: string): T {
  return parse(text, reviver) as T
}
