import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { storage } from './storage'
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

// 單一旅程 + 成員（主畫面頂列頭像對用）。RLS 確保非成員查不到 → 回傳 null。
export async function getTripWithMembers(tripId: string): Promise<TripWithMembers | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*, members:trip_members(trip_id, user_id, role, joined_at)')
    .eq('id', tripId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const trip = data as Trip & { members: TripMember[] }

  // trip_members 與 profiles 無直接 FK（皆指向 auth.users），故 profiles 另撈再 stitch（同 listMyTrips）
  const userIds = [...new Set(trip.members.map((m) => m.user_id))]
  const profileById = new Map<string, Profile>()
  if (userIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .in('id', userIds)
    if (pErr) throw pErr
    for (const p of (profiles ?? []) as Profile[]) profileById.set(p.id, p)
  }

  return {
    ...trip,
    members: trip.members.map((m) => ({ ...m, profile: profileById.get(m.user_id) ?? null })),
  }
}

// 建立旅程（走 RPC：原子產生邀請碼 + 加自己為 owner）
export async function createTrip(input: {
  name: string
  destination?: string | null
  start_date?: string | null
  end_date?: string | null
  dest_lat?: number | null
  dest_lng?: number | null
  dest_place_id?: string | null
}): Promise<Trip> {
  const { data, error } = await supabase.rpc('create_trip', {
    p_name: input.name,
    p_destination: input.destination ?? null,
    p_start_date: input.start_date ?? null,
    p_end_date: input.end_date ?? null,
    p_dest_lat: input.dest_lat ?? null,
    p_dest_lng: input.dest_lng ?? null,
    p_dest_place_id: input.dest_place_id ?? null,
  })
  if (error) throw error
  return data as Trip
}

// 可修改的旅程欄位（RLS「creator update trips」限建立者）
export type TripPatch = Partial<
  Pick<
    Trip,
    'name' | 'destination' | 'start_date' | 'end_date' | 'dest_lat' | 'dest_lng' | 'dest_place_id'
  >
>

// 修改旅程（名稱/目的地/日期/座標）。非建立者會被 RLS 擋下（回傳 0 列）。
export async function updateTrip(id: string, patch: TripPatch): Promise<Trip> {
  const { data, error } = await supabase.from('trips').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Trip
}

// 刪除旅程。先清該趟 Storage 檔（趁成員身分仍有效，否則刪 trip 後 trip_members 連帶消失、
// storage RLS 會擋下），再刪 trips 列（子表 FK on delete cascade 自動清）。
// Storage 清檔為 best-effort：失敗不掩蓋、也不阻斷主刪除（孤兒檔不影響功能）。
export async function deleteTrip(id: string): Promise<void> {
  await storage.removeByPrefix(id).catch((e) => {
    console.warn('[api] 刪除旅程時清 Storage 檔失敗（孤兒檔將殘留）', e)
  })
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw error
}

// 用邀請碼加入旅程（走 RPC：驗證碼、防重複、限兩人）。RPC 的 raise exception 訊息會帶在 error.message。
export async function joinTripByCode(code: string): Promise<Trip> {
  const { data, error } = await supabase.rpc('join_trip_by_code', { p_code: code })
  if (error) throw error
  return data as Trip
}
