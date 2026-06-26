import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import {
  faMap,
  faFileLines,
  faSuitcaseRolling,
  faBell,
  faArrowLeft,
  faPlus,
  faGear,
  faChevronRight,
  faChevronDown,
  faStar,
  faClock,
  faLocationDot,
  faPersonWalking,
  faTrainSubway,
  faCar,
  faMagnifyingGlass,
  faListUl,
  faLayerGroup,
  faLocationArrow,
  faLink,
  faArrowUpFromBracket,
  faCloud,
  faSlash,
  faCheck,
  faXmark,
  faPlaneUp,
  faBed,
  faIdCard,
  faTicket,
  faHeart,
  faBookmark,
  faPenToSquare,
  faTrashCan,
  faEllipsisVertical,
  faUpDownLeftRight,
  faWandMagicSparkles,
  faUsers,
  faCamera,
  faEnvelope,
  faUtensils,
  faMugSaucer,
  faMountainSun,
  faUmbrellaBeach,
  faHotTubPerson,
  faStore,
  faMasksTheater,
  faArrowsRotate,
  faDownload,
  faCircleInfo,
  faPlaneDeparture,
  faHotel,
} from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartReg, faStar as faStarReg } from '@fortawesome/free-regular-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'

// 全域唯一圖示來源＝Font Awesome 6（免費版）。先前手繪 SVG 易畫歪、粗細不一，改用 FA 求一致。
// 改用 bundle 進來的 FA CSS（而非 FA 執行期注入 <style>），避免首屏圖示瞬間放大再縮回的閃爍。
config.autoAddCss = false

// name → solid（預設）＋ regular（僅 heart/star：fill=false 時用空心線稿，fill 時實心強調）。
// key 是資料契約：bookmark_lists.icon 與行李分類存的就是這些字串（見 src/lib/bookmarkLists.ts 的
// LIST_ICONS），故所有 key 不可更名或刪除；新增則安全。
type IconEntry = { solid: IconDefinition; regular?: IconDefinition }
const ICONS = {
  map: { solid: faMap },
  doc: { solid: faFileLines },
  bag: { solid: faSuitcaseRolling },
  bell: { solid: faBell },
  back: { solid: faArrowLeft },
  plus: { solid: faPlus },
  gear: { solid: faGear },
  chevR: { solid: faChevronRight },
  chevD: { solid: faChevronDown },
  star: { solid: faStar, regular: faStarReg },
  clock: { solid: faClock },
  pin: { solid: faLocationDot },
  walk: { solid: faPersonWalking },
  train: { solid: faTrainSubway },
  car: { solid: faCar },
  search: { solid: faMagnifyingGlass },
  list: { solid: faListUl },
  layers: { solid: faLayerGroup },
  nav: { solid: faLocationArrow },
  link: { solid: faLink },
  upload: { solid: faArrowUpFromBracket },
  cloud: { solid: faCloud },
  cloudoff: { solid: faCloud }, // 實際以 layering（雲＋斜線）渲染，見下方特例
  check: { solid: faCheck },
  x: { solid: faXmark },
  plane: { solid: faPlaneUp },
  bed: { solid: faBed },
  id: { solid: faIdCard },
  ticket: { solid: faTicket },
  heart: { solid: faHeart, regular: faHeartReg },
  bookmark: { solid: faBookmark },
  edit: { solid: faPenToSquare },
  trash: { solid: faTrashCan },
  more: { solid: faEllipsisVertical },
  move: { solid: faUpDownLeftRight },
  google: { solid: faGoogle },
  sparkle: { solid: faWandMagicSparkles },
  users: { solid: faUsers },
  camera: { solid: faCamera },
  mail: { solid: faEnvelope },
  food: { solid: faUtensils },
  coffee: { solid: faMugSaucer },
  mountain: { solid: faMountainSun },
  beach: { solid: faUmbrellaBeach },
  onsen: { solid: faHotTubPerson },
  mall: { solid: faStore },
  ferris: { solid: faMasksTheater }, // FA6 免費無摩天輪；以「娛樂」面具代表此分類
  // 以下為設定頁 PWA 工具新增（純新增、無資料遷移）
  refresh: { solid: faArrowsRotate },
  download: { solid: faDownload },
  info: { solid: faCircleInfo },
  // 提醒功能用
  planeDep: { solid: faPlaneDeparture },
  hotel: { solid: faHotel },
} satisfies Record<string, IconEntry>

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number // 像素高度（寬度依字形比例，預設 22）
  fill?: boolean // true=實心 solid；false 且該圖示有線稿版時=regular（預設 false）
  className?: string
}

export default function Icon({ name, size = 22, fill = false, className }: IconProps) {
  // 只設 fontSize：FA 的 svg 高度=1em、寬度依 viewBox 比例自動，避免強制等寬高把非方形圖示壓扁
  const style = { fontSize: `${size}px` }

  // cloudoff 特例：FA6 免費無 cloud-slash，用 layering 疊「雲＋斜線」表達離線
  if (name === 'cloudoff') {
    return (
      <span className={`fa-layers ${className ?? ''}`} style={style} aria-hidden="true">
        <FontAwesomeIcon icon={faCloud} />
        <FontAwesomeIcon icon={faSlash} />
      </span>
    )
  }

  const entry: IconEntry = ICONS[name]
  const def = fill ? entry.solid : (entry.regular ?? entry.solid)
  return <FontAwesomeIcon icon={def} className={className} style={style} />
}
