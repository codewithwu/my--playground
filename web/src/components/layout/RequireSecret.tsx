import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSecret } from '../../lib/session'

/**
 * 门禁。未连接时一律重定向到 /connect,浏览器后退也无法绕过
 * (redirect 的是路由而不是弹遮罩,状态不在组件里,刷新行为也明确)。
 */
export function RequireSecret({ children }: { children: ReactNode }) {
  const secret = useSecret()
  const location = useLocation()

  if (!secret) {
    return <Navigate to="/connect" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
