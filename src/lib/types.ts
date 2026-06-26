// 資料表列型別（對應 docs/03 / supabase/schema.sql）。日期欄位為 'YYYY-MM-DD' 字串。

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Trip {
  id: string
  name: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  cover_image_url: string | null
  invite_code: string | null
  // 目的地座標（功能 3：地圖預設範圍的退路）。由建立/修改時的地點搜尋帶入；舊旅程為 null。
  dest_lat: number | null
  dest_lng: number | null
  dest_place_id: string | null
  created_by: string | null
  created_at: string
}

export type TripRole = 'owner' | 'member'

export interface TripMember {
  trip_id: string
  user_id: string
  role: TripRole
  joined_at: string
}

// 成員 + 其個人資料（列表顯示頭像/暱稱用）
export interface TripMemberWithProfile extends TripMember {
  profile: Profile | null
}

// 旅程 + 成員（畫面 1 主要型別）
export interface TripWithMembers extends Trip {
  members: TripMemberWithProfile[]
}

// ---- 行程核心（階段 2；對應 docs/03 的 days / items / area_candidates） ----

export type ItemType = 'point' | 'area'
// bookmark = 想去、未排入某天（day_id 為 null）；scheduled = 已排入某天
export type ItemStatus = 'bookmark' | 'scheduled'

export interface Day {
  id: string
  trip_id: string
  date: string // 'YYYY-MM-DD'
  day_index: number // Day1=1, Day2=2...
  created_at: string
}

export interface Item {
  id: string
  trip_id: string
  day_id: string | null // null = 書籤（尚未排入）
  type: ItemType
  status: ItemStatus
  name: string
  lat: number | null
  lng: number | null
  google_place_id: string | null
  photo_url: string | null
  scheduled_time: string | null // 'HH:MM[:SS]' 造訪時間（定點常用）
  time_slot: string | null // 區域時段，如 '下午'
  radius_m: number | null // 區域圓形半徑（type=area 時）
  is_bookmarked: boolean // 收藏旗標（功能 2：與 status/day_id 脫鉤；排入某天後仍可為 true）
  tags: string[] // 清單（功能 2：Google 地圖式，一個地點可在多個清單），如 ['想去','美食']
  timezone: string | null // 該地點 IANA 時區（功能 5：由座標自動推得；通知換算用）
  alias: string | null // 自定義別名（顯示用；空則用 name）
  stay_minutes: number | null // 停留分鐘（三時間：抵達=scheduled_time、離開=抵達+停留）
  departure_time: string | null // 離開時間 'HH:MM[:SS]'（三時間；只存手動值，跨站串接於前端推算）
  lodging_id: string | null // 非 null＝住宿項目（住宿刪除時連帶清）
  lodging_auto: boolean // 住宿自動產生的頭/尾（手動複製本=false）
  order_index: number // 同一天內排序
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface AreaCandidate {
  id: string
  item_id: string // 必為 type=area 的 item
  name: string
  lat: number | null
  lng: number | null
  google_place_id: string | null
  chosen: boolean // 當天決定去這間
  notes: string | null
  created_at: string
}

// 區域 item + 其候選店家（區域卡展開 / 區域詳情用）
export interface ItemWithCandidates extends Item {
  candidates?: AreaCandidate[]
}

// ---- 交通（階段 3；對應 docs/03 的 transports） ----

// walk/transit/drive 走 Google Directions；custom 為自填（新幹線/包車/渡輪…）。
// flight 為航班（功能 5）：起訖機場為自動建立的 point，航班資訊在文件→機票編輯。
// bike 保留於 enum 但本階段 UI 未提供。
export type TransportMode = 'walk' | 'transit' | 'drive' | 'bike' | 'custom' | 'flight'

// 路線步驟摘要（多路線選定後存於 transports.steps，顯示步行/公車轉乘與公車號）
export interface TransitStep {
  mode: 'walk' | 'transit' | 'drive' // 步行 / 搭乘 / 開車
  line: string | null // 路線名/號，如 '87'、'御堂筋線'（transit 時）
  vehicle: string | null // 交通工具中文，如 '公車'、'地鐵'、'火車'
  from: string | null // 上車站名
  to: string | null // 下車站名
  num_stops: number | null // 經過站數
  duration_min: number // 此步驟分鐘
}

export interface Transport {
  id: string
  trip_id: string
  from_item_id: string
  to_item_id: string
  mode: TransportMode
  duration_min: number | null
  distance_m: number | null
  custom_label: string | null // 自定義方式名稱，如 '新幹線'
  flight_no: string | null // 航班編號（功能 5：mode='flight' 時，如 'BR198'）
  cost_text: string | null // 費用顯示字串，如 '¥240'
  route_polyline: string | null // Google encoded polyline（畫真實路線用）
  // 航班/跨時區起訖（功能 5）：local 為當地牆鐘 'YYYY-MM-DDTHH:MM[:SS]'，tz 為 IANA 時區
  depart_local: string | null
  depart_tz: string | null
  arrive_local: string | null
  arrive_tz: string | null
  depart_terminal: string | null // 出發航廈（航班）
  arrive_terminal: string | null // 抵達航廈（航班）
  steps: TransitStep[] | null // 路線步驟摘要（多路線選定後存）
  notes: string | null
  created_at: string
}

// ---- 住宿（對應 docs/03 的 lodgings）：自動在對應日期頭尾建住宿 items（items.lodging_id） ----

export interface Lodging {
  id: string
  trip_id: string
  name: string // 飯店名
  lat: number | null
  lng: number | null
  google_place_id: string | null
  photo_url: string | null // 飯店照片（搜尋時抓；同步到行程地標用）
  timezone: string | null
  check_in: string // 'YYYY-MM-DD' 入住日
  check_out: string // 'YYYY-MM-DD' 退房日
  doc_id: string | null // 訂房單（documents.id；選填）
  notes: string | null
  created_by: string | null
  created_at: string
}

// ---- 文件匣（階段 4；對應 docs/03 的 documents） ----

// 機票 / 住宿 / 文件（簽證保險證件） / 其他
export type DocumentCategory = 'flight' | 'lodging' | 'document' | 'other'

// file=上傳檔案；note=Markdown 備忘錄（功能 6，storage_path 為 null、內文在 content）
export type DocumentKind = 'file' | 'note'

// 連結（document_items / document_transports）為多對多：一個項目/交通可連多份文件，
// 一份文件也可連多個項目/交通。前端只需文件本身，連結以 document_id+item_id/transport_id 操作。
export interface Document {
  id: string
  trip_id: string
  category: DocumentCategory
  kind: DocumentKind
  file_name: string // 檔案原始檔名；備忘錄則為標題
  storage_path: string | null // 檔案的 Storage 路徑（透過 storage 抽象層）；備忘錄為 null
  content: string | null // 備忘錄的 Markdown 內文（kind='note' 時）
  uploaded_by: string | null
  created_at: string
}

// ---- 行李清單（階段 5；對應 docs/03 的 packing_items） ----

export interface PackingItem {
  id: string
  trip_id: string
  owner_user_id: string // 誰的行李（RLS：只有本人能寫）
  name: string
  category_id: string | null // → packing_categories.id；null = 未分類
  is_packed: boolean
  created_at: string
}

// 行李分類（各自管理；對應 packing_categories）。RLS：成員可讀、只有本人能寫。
export interface PackingCategory {
  id: string
  trip_id: string
  owner_user_id: string
  name: string
  sort_order: number
  created_at: string
}

// 景點清單 metadata（對應 bookmark_lists）。清單仍以 items.tags 的「名稱」歸屬，
// 本表以 (trip_id, name) 為鍵掛 icon/顏色，供地圖 marker 顯示。
export interface BookmarkList {
  id: string
  trip_id: string
  name: string
  icon: string // 取自前端 Icon 集（見 lib/bookmarkLists 的 LIST_ICONS）
  color: string // hex（見 LIST_COLORS）
  sort_order: number
  created_at: string
}

// ---- 提醒（Web Push 通知功能） ----

export type ReminderTemplate =
  | 'restaurant'
  | 'checkin'
  | 'airport_arrival'
  | 'boarding'
  | 'checkout'
  | 'custom'
export type ReminderTargetType = 'item' | 'transport' | 'lodging'

export interface Reminder {
  id: string
  trip_id: string
  target_type: ReminderTargetType
  target_id: string
  target_name: string
  template: ReminderTemplate
  message: string | null
  fire_at: string // ISO timestamptz（UTC）
  offset_minutes: number
  fired: boolean
  created_by: string | null
  created_at: string
}

// ---- 改動紀錄（階段 6；對應 docs/03 的 activity_log） ----

export interface ActivityEntry {
  id: string
  trip_id: string
  user_id: string | null
  action: string // 動作代碼，見 src/lib/activity.ts 的 ActivityAction
  target_summary: string | null // 不含人名的完整動作句，UI 渲染 = <b>名字</b> + 此句
  created_at: string
}
