import { useEffect, useState } from 'react'

/**
 * 防抖。搜索两个桶每日各 5000 次额度,足以支撑输入即搜,
 * 但每个击键都发请求仍然浪费 —— 500ms 防抖后只在停顿时发一次。
 */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
