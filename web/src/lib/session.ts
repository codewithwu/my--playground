import { useSyncExternalStore } from 'react'

/**
 * Access Secret 存储。
 *
 * 用 sessionStorage 而不是 localStorage:
 * 关掉标签页即自动清除,共享电脑上下一个人打开是干净的。
 * 不实现「记住我」的 localStorage 开关 —— 为了一个便利功能
 * 引入 XSS 可利用面(密钥就在页面可读的存储里)不划算。
 *
 * 本应用不存储、不代理、不转发任何凭据:请求由浏览器直接发往知乎开放平台。
 */

const STORAGE_KEY = 'zhihu.accessSecret'

function read(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    // 隐私模式下 sessionStorage 可能抛异常
    return null
  }
}

let current: string | null = read()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSecret(): string | null {
  return current
}

export function setSecret(secret: string) {
  const trimmed = secret.trim()
  if (!trimmed) return
  try {
    sessionStorage.setItem(STORAGE_KEY, trimmed)
  } catch {
    // 存不进去也继续用内存值,至少本次会话可用
  }
  current = trimmed
  emit()
}

export function clearSecret() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 同上
  }
  current = null
  emit()
}

/** 订阅凭据状态,用于门禁和「退出」按钮。 */
export function useSecret(): string | null {
  return useSyncExternalStore(subscribe, getSecret, getSecret)
}
