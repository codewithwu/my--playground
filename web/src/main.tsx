import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // PLAN.md §5.3:全部显式指定,绝不依赖默认值。
      // 尤其 refetchOnWindowFocus —— 默认 true 会在每次切回标签页时重新请求,
      // 而 creator 额度只有 200/天,这类隐式请求会悄悄烧掉配额。
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: 30 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* HashRouter:GitHub Pages 不做 history fallback,深链接会 404。见 PLAN.md §3.1 */}
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
