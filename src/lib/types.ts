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
  category: string | null // 自由標記，如 '逛街'
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
// bike 保留於 enum 但本階段 UI 未提供。
export type TransportMode = 'walk' | 'transit' | 'drive' | 'bike' | 'custom'

export interface Transport {
  id: string
  trip_id: string
  from_item_id: string
  to_item_id: string
  mode: TransportMode
  duration_min: number | null
  distance_m: number | null
  custom_label: string | null // 自定義方式名稱，如 '新幹線'
  cost_text: string | null // 費用顯示字串，如 '¥240'
  route_polyline: string | null // Google encoded polyline（畫真實路線用）
  notes: string | null
  created_at: string
}

// ---- 文件匣（階段 4；對應 docs/03 的 documents） ----

// 機票 / 住宿 / 文件（簽證保險證件） / 其他
export type DocumentCategory = 'flight' | 'lodging' | 'document' | 'other'

// 連結（document_items / document_transports）為多對多：一個項目/交通可連多份文件，
// 一份文件也可連多個項目/交通。前端只需文件本身，連結以 document_id+item_id/transport_id 操作。
export interface Document {
  id: string
  trip_id: string
  category: DocumentCategory
  file_name: string
  storage_path: string // Storage 內路徑（一律透過 storage 抽象層存取）
  uploaded_by: string | null
  created_at: string
}

// ---- 行李清單（階段 5；對應 docs/03 的 packing_items） ----

export interface PackingItem {
  id: string
  trip_id: string
  owner_user_id: string // 誰的行李（RLS：只有本人能寫）
  name: string
  category: string | null // 證件 / 電子產品 / 盥洗...
  is_packed: boolean
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
