/** 知乎开放平台业务错误码 → 用户可读文案。 */
export class ZhihuError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ZhihuError'
    this.code = code
  }
}

/** 鉴权失败:Access Secret 无效或被撤销。全局处理 —— 清凭据 + 回门禁页。 */
export const CODE_AUTH_FAILED = 20001

const MESSAGES: Record<number, string> = {
  10001: '请求参数有误',
  20001: 'Access Secret 无效或已被撤销',
  30001: '请求过于频繁,已加入队列',
  30002: '今日额度已用尽',
  90001: '知乎服务内部错误,请稍后重试',
}

export function describeError(error: unknown): string {
  if (error instanceof ZhihuError) {
    return MESSAGES[error.code] ?? `接口错误(${error.code})`
  }
  if (error instanceof TypeError) {
    return '网络请求失败,请检查网络连接'
  }
  return error instanceof Error ? error.message : '发生未知错误'
}
