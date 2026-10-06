import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/** 三态:跟随系统 / 强制亮 / 强制暗 */
export type Theme = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'zhihu-studio-theme'

/** 与 index.html 里的首屏脚本保持一致的两端 —— 两处值必须同步 */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f7f7f8',
  dark: '#0a0a0b',
}

function readStored(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

function subscribeSystem(onChange: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 把已解析的主题落到 DOM 上。首屏由 index.html 的内联脚本先跑一遍,这里只负责后续切换。 */
export function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[resolved])
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStored)

  // 系统偏好是外部状态,用 useSyncExternalStore 订阅而不是塞进 effect ——
  // 这样 resolvedTheme 是派生值,不存在"setState 触发级联渲染"的问题。
  const systemTheme = useSyncExternalStore(subscribeSystem, getSystemTheme, getSystemTheme)
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'
      // 跟随系统时移除 key,而不是存一个 'system' —— 下次读到的默认语义更清楚
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { theme, resolvedTheme, cycle }
}