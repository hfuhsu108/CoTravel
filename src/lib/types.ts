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
