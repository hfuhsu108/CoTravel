import { NavLink, Outlet, useParams } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import ActivityBanner from '../components/ActivityBanner'
import { useAuth } from '../lib/auth'
import { TripRealtimeProvider } from '../lib/tripRealtime'

// 畫面 2 外殼：主畫面，底部三分頁（地圖 / 文件 / 行李）。內容由各 tab 子路由填入。
// 通用標題列移除——地圖分頁是全幅地圖、有自己的浮層頂列（返回/旅程名/頭像/鈴鐺）。
// Realtime 訂閱掛在這層：分頁切換不重建 channel，banner 三分頁皆可見。
const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: 'map', label: '地圖', icon: 'map' },
  { to: 'docs', label: '文件', icon: 'doc' },
  { to: 'packing', label: '行李', icon: 'bag' },
  { to: 'settings', label: '設定', icon: 'gear' },
]

export default function TripMain() {
  const { tripId = '' } = useParams()
  const { user } = useAuth()

  return (
    <TripRealtimeProvider tripId={tripId} meId={user?.id ?? ''}>
      {/* 窄螢幕：上內容 + 下分頁列（col-reverse 讓 DOM 先放 nav 仍顯示在下）。
          寬螢幕：左側直立 nav rail + 右側內容（row）。 */}
      <div className="flex h-full flex-col-reverse lg:flex-row">
        {/* 分頁導覽：窄=底部列、寬=左側 rail（z 低於地圖浮層/側欄/詳情） */}
        <nav className="z-10 flex flex-none border-line bg-surface border-t px-[10px] pb-7 pt-[9px] lg:w-[80px] lg:flex-col lg:gap-1 lg:border-r lg:border-t-0 lg:px-2 lg:pb-4 lg:pt-5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-[14px] py-[6px] text-[11px] font-bold lg:flex-none ${
                  isActive ? 'text-primary-deep' : 'text-ink-3'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-[30px] w-[46px] items-center justify-center rounded-[11px] transition-colors ${
                      isActive ? 'bg-primary-soft' : ''
                    }`}
                  >
                    <Icon name={tab.icon} size={22} />
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 各分頁自管捲動；地圖分頁需全幅，故這裡 overflow-hidden + relative 供浮層定位 */}
        <main className="relative flex-1 overflow-hidden">
          <Outlet />
          <ActivityBanner />
        </main>
      </div>
    </TripRealtimeProvider>
  )
}
