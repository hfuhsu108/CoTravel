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
