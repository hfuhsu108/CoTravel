import { createHashRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './lib/auth'
import { PwaProvider } from './lib/pwa/PwaProvider'
import PwaUpdateBanner from './components/PwaUpdateBanner'
import Login from './routes/Login'
import TripList from './routes/TripList'
import TripMain from './routes/TripMain'
import MapTab from './routes/tabs/MapTab'
import DocsTab from './routes/tabs/DocsTab'
import PackingTab from './routes/tabs/PackingTab'
import SettingsTab from './routes/tabs/SettingsTab'

// App 外殼：以 AuthProvider 包裹全站。
// 旅程內頁（/trips/:id/...）走寬版（寬螢幕＝地圖左側常駐 + 行程右欄，見 MapTab）；
// 其餘（登入、旅程列表）維持手機寬度置中欄（桌面兩側留白、手機滿版）。
function AppRoot() {
  const { pathname } = useLocation()
  const wideRoute = /^\/trips\/[^/]+/.test(pathname)
  return (
    <PwaProvider>
      <AuthProvider>
        <PwaUpdateBanner />
        <div
          className={`relative h-[100dvh] w-full overflow-hidden bg-bg ${
            wideRoute ? '' : 'mx-auto max-w-[480px]'
          }`}
        >
          <Outlet />
        </div>
      </AuthProvider>
    </PwaProvider>
  )
}

// HashRouter：GitHub Pages 子路徑下重新整理不會 404（見 docs/02 決策 5）。
// /login 公開；/trips* 需登入（RequireAuth 守衛，未登入導回 /login）。
export const router = createHashRouter([
  {
    element: <AppRoot />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <Login /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'trips', element: <TripList /> },
          {
            path: 'trips/:tripId',
            element: <TripMain />,
            children: [
              { index: true, element: <Navigate to="map" replace /> },
              { path: 'map', element: <MapTab /> },
              { path: 'docs', element: <DocsTab /> },
              { path: 'packing', element: <PackingTab /> },
              { path: 'settings', element: <SettingsTab /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])
