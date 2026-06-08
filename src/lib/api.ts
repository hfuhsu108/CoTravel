import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile, Trip, TripMember, TripWithMembers } from './types'

// 登入後確保 profile 存在（DB 觸發器是主要途徑，這裡是後備：補上觸發器尚未涵蓋的舊帳號）。
// 用 ignoreDuplicates 只在缺漏時插入，不覆蓋既有資料（未來有個資編輯時不會被登入動作清掉）。
export async function upsertMyProfile(user: User): Promise<void> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const displayName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    user.email?.split('@')[0] ||
    '旅人'
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, display_name: displayName, avatar_url: avatarUrl },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  if (error) throw error
}

// 我參與的所有旅程 + 成員（含 profile）。RLS 已限定只會回傳我是成員的趟次。
export async function listMyTrips(): Promise<TripWithMembers[]> {
  // 先撈 trips + 成員（trip_members 對 trips 有 FK 可 embed）
  const { data, error } = await supabase
    .from('trips')
    .select('*, members:trip_members(trip_id, user_id, role, joined_at)')
  if (error) throw error
  const trips = (data ?? []) as (Trip & { members: TripMember[] })[]

  // trip_members 與 profiles 之間無直接 FK（皆指向 auth.users），故 profiles 另外撈一次再 stitch
  const userIds = [...new Set(trips.flatMap((t) => t.members.map((m) => m.user_id)))]
  const profileById = new Map<string, Profile>()
  if (userIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .in('id', userIds)
    if (pErr) throw pErr
    for (const p of (profiles ?? []) as Profile[]) profileById.set(p.id, p)
  }

  return trips.map((t) => ({
    ...t,
    members: t.members.map((m) => ({ ...m, profile: profileById.get(m.user_id) ?? null })),
  }))
}

// 建立旅程（走 RPC：原子產生邀請碼 + 加自己為 owner）
export async function createTrip(input: {
  name: string
  destination?: string | null
  start_date?: string | null
  end_date?: string | null
}): Promise<Trip> {
  const { data, error } = await supabase.rpc('create_trip', {
    p_name: input.name,
    p_destination: input.destination ?? null,
    p_start_date: input.start_date ?? null,
    p_end_date: input.end_date ?? null,
  })
  if (error) throw error
  return data as Trip
}

// 用邀請碼加入旅程（走 RPC：驗證碼、防重複、限兩人）。RPC 的 raise exception 訊息會帶在 error.message。
export async function joinTripByCode(code: string): Promise<Trip> {
  const { data, error } = await supabase.rpc('join_trip_by_code', { p_code: code })
  if (error) throw error
  return data as Trip
}
