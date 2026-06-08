import { NavLink, Outlet, useParams } from 'react-router-dom'

// 畫面 2 外殼：主畫面，底部三分頁（地圖 / 文件 / 行李）。內容由各 tab 子路由填入。
const tabs = [
  { to: 'map', label: '地圖' },
  { to: 'docs', label: '文件' },
  { to: 'packing', label: '行李' },
]

export default function TripMain() {
  const { tripId } = useParams()

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-center pb-3 pt-14">
        <span className="font-bold">旅程 {tripId}</span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="flex border-t border-line bg-surface px-2 pb-7 pt-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex-1 rounded-md py-2 text-center text-xs font-bold ${
                isActive ? 'bg-primary-soft text-primary-deep' : 'text-ink-3'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
