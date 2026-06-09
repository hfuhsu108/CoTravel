// 交通詳情 hero 用的裝飾性路線縮圖（移植設計稿 screens-main.jsx 的 MiniRouteMap）。
// 純示意，不放真實互動地圖——真實路線畫在主地圖（DayRoutes）。色彩走 --map-* / --primary / --pink token。
export default function MiniRouteMap() {
  return (
    <svg viewBox="0 0 393 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="393" height="200" fill="var(--map-bg)" />
      <path
        d="M-10 150 C80 130 140 170 240 150 C320 134 410 150 410 150 L410 220 L-10 220Z"
        fill="var(--map-water)"
      />
      <rect x="60" y="30" width="80" height="55" rx="14" fill="var(--map-park)" />
      <g stroke="#fff" strokeWidth="11" fill="none">
        <path d="M0 70H393" />
        <path d="M0 130H393" />
        <path d="M180 0V200" />
      </g>
      <g stroke="var(--map-road-minor)" strokeWidth="5" fill="none">
        <path d="M90 0V200" />
        <path d="M300 0V200" />
      </g>
      <polyline
        points="70,50 180,70 250,130 320,150"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <circle cx="70" cy="50" r="9" fill="var(--primary)" stroke="#fff" strokeWidth="3" />
      <circle cx="320" cy="150" r="9" fill="var(--pink)" stroke="#fff" strokeWidth="3" />
    </svg>
  )
}
