import { createHashRouter, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './lib/auth'
import Login from './routes/Login'
import TripList from './routes/TripList'
import TripMain from './routes/TripMain'
import MapTab from './routes/tabs/MapTab'
import DocsTab from './routes/tabs/DocsTab'
import PackingTab from './routes/tabs/PackingTab'
import SettingsTab from './routes/tabs/SettingsTab'

// App 外殼：以 AuthProvider 包裹全站，內容置中於手機寬度欄（桌面寬版兩側留白、手機滿版）。
function AppRoot() {
  return (
    <AuthProvider>
      <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-bg">
        <Outlet />
      </div>
    </AuthProvider>
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
