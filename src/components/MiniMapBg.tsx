// 旅程卡封面的手繪風迷你地圖（純 SVG 佔位，對應 prototype 的 MiniMapBg）。
// 之後若有真實封面圖則改用圖片，此處供「地圖預覽」型封面使用。
export default function MiniMapBg() {
  return (
    <svg
      viewBox="0 0 393 140"
      width="100%"
      height="100%"
      className="absolute inset-0"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="393" height="140" fill="var(--map-bg)" />
      <path d="M-10 96 C60 80 120 120 200 104 C280 90 360 110 410 96 L410 150 L-10 150Z" fill="var(--map-water)" />
      <rect x="40" y="20" width="70" height="48" rx="12" fill="var(--map-park)" />
      <g stroke="#fff" strokeWidth="9" fill="none">
        <path d="M0 50H393" />
        <path d="M150 0V140" />
        <path d="M280 0V140" />
      </g>
      <g stroke="var(--map-road-minor)" strokeWidth="4" fill="none">
        <path d="M0 90H393" />
        <path d="M70 0V140" />
      </g>
      <circle cx="200" cy="62" r="6" fill="var(--primary)" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}
