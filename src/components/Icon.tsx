import type { ReactNode } from 'react'

// Inline SVG 圖示庫，移植自 design_handoff/data.jsx 的 ICONS（24×24、stroke=currentColor、圓角端點）。
// fill 模式時改用 currentColor 填滿、不描邊（對應 prototype 的 <Ico ... fill/>）。
const ICONS = {
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  bag: (
    <>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  gear: (
    // 對稱 8 齒齒輪（座標由 node 精算，避免手刻不對稱；中心圓孔另畫）
    <>
      <path d="M9.84 2.65L14.16 2.65L14.64 5.63L17.09 3.86L20.14 6.91L18.37 9.36L21.35 9.84L21.35 14.16L18.37 14.64L20.14 17.09L17.09 20.14L14.64 18.37L14.16 21.35L9.84 21.35L9.36 18.37L6.91 20.14L3.86 17.09L5.63 14.64L2.65 14.16L2.65 9.84L5.63 9.36L3.86 6.91L6.91 3.86L9.36 5.63Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  chevR: <path d="M9 6l6 6-6 6" />,
  chevD: <path d="M6 9l6 6 6-6" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  walk: (
    // 重畫：對稱比例的步行人形（頭＋軀幹＋前後腿＋雙臂），取代原本歪斜的腳形
    <>
      <circle cx="12.5" cy="4" r="2" />
      <path d="M12.5 6.2 11 12.4 8.8 18.5M11 12.4 14 16 14.8 20M12.6 7.6 15.8 9.2M12.6 7.6 9.6 9" />
    </>
  ),
  train: (
    // 重畫：正面電車（車身＋車窗線＋對稱雙頭燈＋對稱底部），左右對稱於 x=12
    <>
      <rect x="5" y="3" width="14" height="14" rx="3.5" />
      <path d="M5 11h14M8 17 6 21M16 17 18 21" />
      <circle cx="9" cy="14" r="1" />
      <circle cx="15" cy="14" r="1" />
    </>
  ),
  car: (
    <>
      <path d="M5 16v2M19 16v2" />
      <path d="M3 13l1.5-5A2 2 0 0 1 6.4 6.5h11.2A2 2 0 0 1 19.5 8L21 13v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3Z" />
      <circle cx="7" cy="13.5" r="1" />
      <circle cx="17" cy="13.5" r="1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4-4" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  layers: <path d="M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 16l10 5 10-5" />,
  nav: <path d="M3 11l18-8-8 18-2-7-8-3Z" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-6-6l-1.5 1.5" />
      <path d="M14 10a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 6 6L12.5 17" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  cloud: <path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17 18H7Z" />,
  cloudoff: (
    <>
      <path d="M7 18a4 4 0 0 1-.5-8M9 6.5A5.5 5.5 0 0 1 17.1 11.5 3.5 3.5 0 0 1 18 18" />
      <path d="m3 3 18 18" />
    </>
  ),
  check: <path d="M5 12.5 10 17l9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plane: <path d="M10.5 19l1-4 7.5-4.5a1.6 1.6 0 0 0-1.5-2.8L13 9 8 6.5l-1.5.9L9 10l-3 1.7-2-1-1 .8 2.5 2 .8 2.8 .8-1 1.6-2.7 2 4.2 1.3-1.5Z" />,
  bed: (
    // 重畫：側視單人床（床頭立柱＋床墊＋枕頭＋棉被線＋床腳），取代原本糊在一起的線條
    <>
      <path d="M4 8v12" />
      <path d="M4 14h16v6" />
      <path d="M4 18h16" />
      <path d="M6.5 14v-2.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V14" />
    </>
  ),
  id: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5 16c.7-1.5 2-2 3.5-2s2.8.5 3.5 2M15 9h4M15 13h3" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
      <path d="M14 6v10" />
    </>
  ),
  // 重畫：左右對稱的愛心（雙瓣對稱於 x=12），取代原本不對稱版本
  heart: (
    <path d="M12 20.3C6.2 16 3.6 12.6 3.6 9.2 3.6 6.7 5.6 5 7.8 5c1.8 0 3.4 1.1 4.2 2.7C12.8 6.1 14.4 5 16.2 5c2.2 0 4.2 1.7 4.2 4.2 0 3.4-2.6 6.8-8.4 11.1Z" />
  ),
  bookmark: <path d="M7 4h10v16l-5-3-5 3V4Z" />,
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M14 6l4 4" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />,
  more: (
    <>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </>
  ),
  move: <path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />,
  google: (
    <path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.4c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.5A9 9 0 0 0 12 21Z M7.1 13.7a5.4 5.4 0 0 1 0-3.4V7.8H3.9a9 9 0 0 0 0 8.4l3.2-2.5Z M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 3.9 7.8l3.2 2.5C7.8 8.1 9.7 6.6 12 6.6Z" />
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M16 14a5 5 0 0 1 5 5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L18 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" transform="translate(0 1)" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  // ---- 旅遊書籤主題（功能擴充：美食 / 自然 / 購物娛樂） ----
  food: (
    // 餐廳：叉子（左）＋刀子（右）
    <>
      <path d="M8 3v18M6 3v4.4M10 3v4.4" />
      <path d="M6 7.4a2 2 0 0 0 4 0" />
      <path d="M16.5 3c-1.5 0-2.4 2.3-2.4 5s.9 3.7 2.4 4V21" />
    </>
  ),
  coffee: (
    // 咖啡：杯身＋把手＋兩道蒸氣
    <>
      <path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
      <path d="M16 9h2.4a2.2 2.2 0 0 1 0 4.4H16" />
      <path d="M8.5 2.6c-.8 1 .8 2 0 3M12.5 2.6c-.8 1 .8 2 0 3" />
    </>
  ),
  mountain: (
    // 自然・山：雙峰＋雪頂
    <>
      <path d="M2 20 9 8l3.5 5L15.5 6 22 20Z" />
      <path d="M6.8 11.8 9 8.6l2 2.8M13.4 9.2 15.5 6.4l2.2 3" />
    </>
  ),
  beach: (
    // 自然・海灘：陽傘＋海浪
    <>
      <path d="M12 4.5V20" />
      <path d="M5 11a7 7 0 0 1 14 0Z" />
      <path d="M3 20.4c1.2 0 1.2-1 2.4-1s1.2 1 2.4 1 1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.4-1" />
    </>
  ),
  onsen: (
    // 自然・溫泉（♨）：浴池＋三道蒸氣
    <>
      <path d="M8 12c-1.2-1.4 1.2-2.8 0-4.2M12 12c-1.2-1.4 1.2-2.8 0-4.2M16 12c-1.2-1.4 1.2-2.8 0-4.2" />
      <path d="M3 16h18" />
      <path d="M5 16a7 7 0 0 0 14 0" />
    </>
  ),
  mall: (
    // 購物・商場：店面＋遮陽棚＋門
    <>
      <path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" />
      <path d="M3 9 5 5h14l2 4Z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  ferris: (
    // 娛樂・摩天輪：輪圈＋輻條＋支架
    <>
      <circle cx="12" cy="10" r="7.5" />
      <circle cx="12" cy="10" r="1.2" />
      <path d="M12 2.5v15M4.5 10h15M6.7 4.7 17.3 15.3M17.3 4.7 6.7 15.3" />
      <path d="M9 19l3-9 3 9M7 20h10" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number
  fill?: boolean
  sw?: number
  className?: string
}

export default function Icon({ name, size = 22, fill = false, sw = 1.9, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}
