import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireSecret } from './components/layout/RequireSecret'
import { ConnectPage } from './features/connect/ConnectPage'
import { CreatorPage } from './features/creator/CreatorPage'
import { DiscoverPage } from './features/discover/DiscoverPage'
import { OverviewPage } from './features/overview/OverviewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/connect" element={<ConnectPage />} />

      <Route
        path="/*"
        element={
          // 门禁包在最外层:未连接时任何路径都会被重定向到 /connect
          <RequireSecret>
            <AppShell>
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/creator" element={<CreatorPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="*" element={<OverviewPage />} />
              </Routes>
            </AppShell>
          </RequireSecret>
        }
      />
    </Routes>
  )
}
