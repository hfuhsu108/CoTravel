// 住宿（比照航班）：在文件→住宿新增；送出時自動在住宿期間每個日期的頭/尾建住宿項目。
// 沿用 itinerary/transports 慣例：薄包裝 Supabase、出錯即 throw（訊息交給 errMessage 顯示）。
// RLS 已限定只有該趟成員可讀寫（見 supabase/schema.sql 的 "members rw lodgings"）。
import { supabase } from './supabase'
import { addItem, eachDate, headOrderIndex, listDays, nextOrderIndex } from './itinerary'
import { tzForCoords } from './time'
import type { Lodging } from './types'

export async function listLodgings(tripId: string): Promise<Lodging[]> {
  const { data, error } = await supabase
    .from('lodgings')
    .select('*')
    .eq('trip_id', tripId)
    .order('check_in', { ascending: true })
  if (error) throw error
  return (data ?? []) as Lodging[]
}

export interface CreateLodgingInput {
  trip_id: string
  name: string
  lat: number | null
  lng: number | null
  google_place_id: string | null
  photo_url?: string | null
  check_in: string // 'YYYY-MM-DD'
  check_out: string // 'YYYY-MM-DD'
  notes?: string | null
  doc_id?: string | null
}

// 在住宿期間每個日期建住宿項目：d>check_in 放當天最頭（早上從飯店出發）、
// d<check_out 放當天最尾（晚上回飯店睡）。落在旅程日範圍外的日期略過（不自動建 day）。
async function generateLodgingItems(lodging: Lodging): Promise<void> {
  const days = await listDays(lodging.trip_id)
  const dayByDate = new Map(days.map((d) => [d.date, d.id]))
  for (const date of eachDate(lodging.check_in, lodging.check_out)) {
    const dayId = dayByDate.get(date)
    if (!dayId) continue
    const common = {
      trip_id: lodging.trip_id,
      type: 'point' as const,
      status: 'scheduled' as const,
      day_id: dayId,
      name: lodging.name,
      lat: lodging.lat,
      lng: lodging.lng,
      google_place_id: lodging.google_place_id,
      photo_url: lodging.photo_url, // 飯店照片帶到行程地標
      lodging_id: lodging.id,
      lodging_auto: true, // 自動產生的頭/尾；手動複製本為 false，住宿編輯重產生時不刪
    }
    // 先尾後頭：尾用 max+1、頭用 min-1，兩者互不影響（尾插入不改變 min）
    if (date < lodging.check_out) {
      await addItem({ ...common, order_index: await nextOrderIndex(dayId) })
    }
    if (date > lodging.check_in) {
      await addItem({ ...common, order_index: await headOrderIndex(dayId) })
    }
  }
}

export async function createLodging(input: CreateLodgingInput): Promise<Lodging> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const created_by = session?.user.id ?? null

  const { data, error } = await supabase
    .from('lodgings')
    .insert({
      trip_id: input.trip_id,
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      google_place_id: input.google_place_id,
      photo_url: input.photo_url ?? null,
      timezone: tzForCoords(input.lat, input.lng),
      check_in: input.check_in,
      check_out: input.check_out,
      doc_id: input.doc_id ?? null,
      notes: input.notes ?? null,
      created_by,
    })
    .select()
    .single()
  if (error) throw error
  const lodging = data as Lodging
  await generateLodgingItems(lodging)
  return lodging
}

export interface UpdateLodgingInput {
  name?: string
  lat?: number | null
  lng?: number | null
  google_place_id?: string | null
  photo_url?: string | null
  check_in?: string
  check_out?: string
  notes?: string | null
  doc_id?: string | null
}

export async function updateLodging(id: string, patch: UpdateLodgingInput): Promise<Lodging> {
  const update: Record<string, unknown> = { ...patch }
  // 座標變更時重算時區
  if (patch.lat !== undefined || patch.lng !== undefined) {
    update.timezone = tzForCoords(patch.lat ?? null, patch.lng ?? null)
  }
  const { data, error } = await supabase
    .from('lodgings')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  const lodging = data as Lodging

  // 只有影響「住宿期間/地點」的變更才重產生行程項目，避免改備註/訂房單時誤刪重建
  const needRegen =
    patch.check_in !== undefined ||
    patch.check_out !== undefined ||
    patch.name !== undefined ||
    patch.lat !== undefined ||
    patch.lng !== undefined ||
    patch.google_place_id !== undefined
  if (needRegen) {
    // 只刪自動產生的頭/尾項目，保留手動複製本（lodging_auto=false，如「先到飯店放行李」那筆）
    const { error: delErr } = await supabase
      .from('items')
      .delete()
      .eq('lodging_id', id)
      .eq('lodging_auto', true)
    if (delErr) throw delErr
    await generateLodgingItems(lodging)
  }
  return lodging
}

// 刪除住宿：items.lodging_id on delete cascade → 自動清掉住宿項目。訂房單檔保留。
export async function removeLodging(id: string): Promise<void> {
  const { error } = await supabase.from('lodgings').delete().eq('id', id)
  if (error) throw error
}
