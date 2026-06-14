// 行程核心資料存取（階段 2）：days / items / area_candidates 的 CRUD。
// 沿用 api.ts 的慣例：薄包裝 Supabase、出錯即 throw（訊息交給 errMessage 顯示）。
// RLS 已限定只有該趟成員可讀寫（見 supabase/schema.sql），故這裡不再自行過濾成員。
import { supabase } from './supabase'
import { tzForCoords } from './time'
import type { AreaCandidate, Day, Item, ItemStatus, ItemType, Trip } from './types'

// 顯示名稱（功能 1）：有別名用別名，否則用原名。搜尋/Google 詳情仍用原 name/google_place_id。
export function displayName(item: Pick<Item, 'alias' | 'name'>): string {
  return item.alias?.trim() || item.name
}

// ---- 日期工具（避免時區誤差：以本地年月日逐日遞增） ----
function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// 回傳 start..end（含兩端）每一天的 'YYYY-MM-DD'；end < start 時退回只含 start。
export function eachDate(start: string, end: string): string[] {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const cur = new Date(sy, sm - 1, sd)
  const last = new Date(ey, em - 1, ed)
  if (last < cur) return [start]
  const dates: string[] = []
  // guard 上限避免異常大區間把畫面灌爆（旅程一般不會超過一年）
  for (let guard = 0; cur <= last && guard < 366; guard++) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

// ---- days ----

export async function listDays(tripId: string): Promise<Day[]> {
  const { data, error } = await supabase
    .from('days')
    .select('*')
    .eq('trip_id', tripId)
    // 次序鍵 created_at：萬一 DB 殘留重複 day_index，去重時能穩定保留最早建立的那筆
    .order('day_index', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Day[]
}

// 依 day_index 去重，保留每組第一筆（防禦：即使 DB 殘留重複日，UI 也只顯示一份且穩定）
function dedupeDays(days: Day[]): Day[] {
  const seen = new Set<number>()
  const out: Day[] = []
  for (const d of days) {
    if (seen.has(d.day_index)) continue
    seen.add(d.day_index)
    out.push(d)
  }
  return out
}

// 冪等：trip 已有 days 直接回傳；否則依 start_date..end_date 逐日建立。
// 無日期的 trip → 建單一 Day 1（date=今天），讓使用者仍能加項目（UI 另提示可補日期）。
// 併發保護：days 有 (trip_id, day_index) 唯一約束（見 supabase/schema.sql），
// React StrictMode 重複觸發或兩人同時首開時，第二次 insert 會撞 23505 → 視為已建立、讀回即可。
export async function ensureDays(trip: Trip): Promise<Day[]> {
  const existing = await listDays(trip.id)
  if (existing.length > 0) return dedupeDays(existing)

  const dates =
    trip.start_date && trip.end_date
      ? eachDate(trip.start_date, trip.end_date)
      : trip.start_date
        ? [trip.start_date]
        : [todayStr()]

  const rows = dates.map((date, i) => ({ trip_id: trip.id, date, day_index: i + 1 }))
  const { error } = await supabase.from('days').insert(rows)
  if (error && error.code !== '23505') throw error
  return dedupeDays(await listDays(trip.id))
}

// ---- items ----

export async function listItems(tripId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return (data ?? []) as Item[]
}

export interface AddItemInput {
  trip_id: string
  type: ItemType
  status: ItemStatus
  day_id?: string | null
  name: string
  lat?: number | null
  lng?: number | null
  google_place_id?: string | null
  photo_url?: string | null
  scheduled_time?: string | null // 抵達時間
  departure_time?: string | null // 離開時間（功能 4；航班出發機場用：起飛時間）
  stay_minutes?: number | null
  time_slot?: string | null
  radius_m?: number | null
  is_bookmarked?: boolean // 省略時：status='bookmark' 自動為 true，其餘 false
  tags?: string[]
  timezone?: string | null // 省略時：有座標則自動由 tz-lookup 推得
  alias?: string | null // 自定義別名（功能 1）
  lodging_id?: string | null // 住宿自動產生的項目掛在此 lodging（住宿管理）
  lodging_auto?: boolean // 住宿自動產生的頭/尾＝true；手動複製本＝false
  order_index?: number // 提供時直接用（住宿頭/尾定位）；否則自動接末位
  notes?: string | null
}

// 取某天現有 order_index 的下一個（接在末位）
export async function nextOrderIndex(dayId: string): Promise<number> {
  const { data, error } = await supabase
    .from('items')
    .select('order_index')
    .eq('day_id', dayId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? (data as { order_index: number }).order_index + 1 : 0
}

// 取某天現有最小 order_index 的前一位（插在最前）；空天回 0。住宿「最頭」用。
export async function headOrderIndex(dayId: string): Promise<number> {
  const { data, error } = await supabase
    .from('items')
    .select('order_index')
    .eq('day_id', dayId)
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? (data as { order_index: number }).order_index - 1 : 0
}

export async function addItem(input: AddItemInput): Promise<Item> {
  // created_by 設為目前使用者（詳情頁「誰加的」頭像用）；getSession 讀本地快取、不打網路
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const created_by = session?.user.id ?? null

  const order_index =
    input.order_index ??
    (input.status === 'scheduled' && input.day_id ? await nextOrderIndex(input.day_id) : 0)

  const { data, error } = await supabase
    .from('items')
    .insert({
      trip_id: input.trip_id,
      day_id: input.day_id ?? null,
      type: input.type,
      status: input.status,
      name: input.name,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      google_place_id: input.google_place_id ?? null,
      photo_url: input.photo_url ?? null,
      scheduled_time: input.scheduled_time ?? null,
      departure_time: input.departure_time ?? null,
      stay_minutes: input.stay_minutes ?? null,
      time_slot: input.time_slot ?? null,
      radius_m: input.radius_m ?? null,
      // 加書籤（status='bookmark'）預設視為已收藏，除非呼叫端明確指定
      is_bookmarked: input.is_bookmarked ?? input.status === 'bookmark',
      tags: input.tags ?? [],
      // 有座標就自動推時區（功能 5）；通知/換算用
      timezone: input.timezone ?? tzForCoords(input.lat, input.lng),
      alias: input.alias ?? null,
      lodging_id: input.lodging_id ?? null,
      lodging_auto: input.lodging_auto ?? false,
      notes: input.notes ?? null,
      order_index,
      created_by,
    })
    .select()
    .single()
  if (error) throw error
  return data as Item
}

// 部分更新（notes / scheduled_time / time_slot / radius_m / name / tags / is_bookmarked…）
export type ItemPatch = Partial<
  Pick<
    Item,
    | 'name'
    | 'alias'
    | 'notes'
    | 'scheduled_time'
    | 'departure_time'
    | 'stay_minutes'
    | 'time_slot'
    | 'radius_m'
    | 'tags'
    | 'is_bookmarked'
    | 'photo_url'
  >
>

export async function updateItem(id: string, patch: ItemPatch): Promise<Item> {
  const { data, error } = await supabase.from('items').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Item
}

// 移到某天（書籤→排入某天也走這支：設 status=scheduled、day_id、接末位 order_index）。
// 功能 2：不動 is_bookmarked，故從書籤排入某天後，該地點仍留在書籤列表。
export async function moveItemToDay(itemId: string, dayId: string): Promise<Item> {
  const order_index = await nextOrderIndex(dayId)
  const { data, error } = await supabase
    .from('items')
    .update({ day_id: dayId, status: 'scheduled', order_index })
    .eq('id', itemId)
    .select()
    .single()
  if (error) throw error
  return data as Item
}

// 同一天內依新順序批次寫 order_index（各列獨立、無唯一約束，可並行）
export async function reorderItems(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from('items')
        .update({ order_index: i })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error
        }),
    ),
  )
}

export async function removeItem(id: string): Promise<void> {
  // area_candidates 對 items 有 on delete cascade，候選會一併刪除
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

// 複製景點（功能 3）：插在原項目之後。保留來源特性（含 lodging_id → 飯店複本仍帶床標記），
// 但 lodging_auto=false，住宿編輯重產生時不會刪到這筆手動複本。不複製時間/備註（複本為新的造訪）。
export async function duplicateItem(source: Item): Promise<Item> {
  // 同天且排在來源之後者往後挪一位，騰出緊接在後的位置（書籤無 day_id 則免挪）
  if (source.day_id) {
    const { data: later, error: selErr } = await supabase
      .from('items')
      .select('id, order_index')
      .eq('day_id', source.day_id)
      .gt('order_index', source.order_index)
    if (selErr) throw selErr
    await Promise.all(
      (later ?? []).map((r) => {
        const row = r as { id: string; order_index: number }
        return supabase
          .from('items')
          .update({ order_index: row.order_index + 1 })
          .eq('id', row.id)
          .then(({ error }) => {
            if (error) throw error
          })
      }),
    )
  }
  return await addItem({
    trip_id: source.trip_id,
    type: source.type,
    status: source.status,
    day_id: source.day_id,
    name: source.name,
    alias: source.alias,
    lat: source.lat,
    lng: source.lng,
    google_place_id: source.google_place_id,
    photo_url: source.photo_url,
    time_slot: source.time_slot,
    radius_m: source.radius_m,
    is_bookmarked: source.is_bookmarked,
    tags: source.tags,
    timezone: source.timezone,
    lodging_id: source.lodging_id,
    lodging_auto: false,
    order_index: source.order_index + 1,
  })
}

// 從書籤列表移除（功能 2）：已排入某天 → 只清收藏旗標（保留行程安排）；
// 純書籤（未排入）→ 整筆刪除。回傳更新後的 item，或 null（已刪除）。
export async function removeFromBookmarks(item: Item): Promise<Item | null> {
  if (item.day_id != null) {
    return await updateItem(item.id, { is_bookmarked: false })
  }
  await removeItem(item.id)
  return null
}

// ---- area_candidates ----

// 一次撈多個區域 item 的候選（側欄計數＋展開、區域詳情共用）
export async function listCandidatesByItems(itemIds: string[]): Promise<AreaCandidate[]> {
  if (itemIds.length === 0) return []
  const { data, error } = await supabase
    .from('area_candidates')
    .select('*')
    .in('item_id', itemIds)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as AreaCandidate[]
}

export interface AddCandidateInput {
  item_id: string
  name: string
  lat?: number | null
  lng?: number | null
  google_place_id?: string | null
  notes?: string | null
}

export async function addCandidate(input: AddCandidateInput): Promise<AreaCandidate> {
  const { data, error } = await supabase
    .from('area_candidates')
    .insert({
      item_id: input.item_id,
      name: input.name,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      google_place_id: input.google_place_id ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as AreaCandidate
}

export async function setCandidateChosen(id: string, chosen: boolean): Promise<void> {
  const { error } = await supabase.from('area_candidates').update({ chosen }).eq('id', id)
  if (error) throw error
}

export async function removeCandidate(id: string): Promise<void> {
  const { error } = await supabase.from('area_candidates').delete().eq('id', id)
  if (error) throw error
}
