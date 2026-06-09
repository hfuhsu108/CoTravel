// 行程核心資料存取（階段 2）：days / items / area_candidates 的 CRUD。
// 沿用 api.ts 的慣例：薄包裝 Supabase、出錯即 throw（訊息交給 errMessage 顯示）。
// RLS 已限定只有該趟成員可讀寫（見 supabase/schema.sql），故這裡不再自行過濾成員。
import { supabase } from './supabase'
import type { AreaCandidate, Day, Item, ItemStatus, ItemType, Trip } from './types'

// ---- 日期工具（避免時區誤差：以本地年月日逐日遞增） ----
function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// 回傳 start..end（含兩端）每一天的 'YYYY-MM-DD'；end < start 時退回只含 start。
function eachDate(start: string, end: string): string[] {
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
  scheduled_time?: string | null
  time_slot?: string | null
  radius_m?: number | null
  category?: string | null
  notes?: string | null
}

// 取某天現有 order_index 的下一個（接在末位）
async function nextOrderIndex(dayId: string): Promise<number> {
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

export async function addItem(input: AddItemInput): Promise<Item> {
  // created_by 設為目前使用者（詳情頁「誰加的」頭像用）；getSession 讀本地快取、不打網路
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const created_by = session?.user.id ?? null

  const order_index =
    input.status === 'scheduled' && input.day_id ? await nextOrderIndex(input.day_id) : 0

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
      time_slot: input.time_slot ?? null,
      radius_m: input.radius_m ?? null,
      category: input.category ?? null,
      notes: input.notes ?? null,
      order_index,
      created_by,
    })
    .select()
    .single()
  if (error) throw error
  return data as Item
}

// 部分更新（notes / scheduled_time / time_slot / radius_m / name / category…）
export type ItemPatch = Partial<
  Pick<
    Item,
    'name' | 'notes' | 'scheduled_time' | 'time_slot' | 'radius_m' | 'category' | 'photo_url'
  >
>

export async function updateItem(id: string, patch: ItemPatch): Promise<Item> {
  const { data, error } = await supabase.from('items').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Item
}

// 移到某天（書籤→定點也走這支：設 status=scheduled、day_id、接末位 order_index）
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
