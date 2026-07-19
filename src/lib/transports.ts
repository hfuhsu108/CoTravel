// 交通資料存取（階段 3）：transports 的 list / upsert / remove。
// 沿用 itinerary.ts 慣例：薄包裝 Supabase、出錯即 throw（訊息交給 errMessage 顯示）。
// RLS 已限定只有該趟成員可讀寫（見 supabase/schema.sql 的 "members rw transports"）。
import { supabase } from './supabase'
import type { Item, TransitStep, Transport, TransportMode } from './types'

export async function listTransports(tripId: string): Promise<Transport[]> {
  const { data, error } = await supabase.from('transports').select('*').eq('trip_id', tripId)
  if (error) throw error
  return (data ?? []) as Transport[]
}

// 航班顯示用：機場 item 的精簡欄位（名稱/座標/時區）
export type AirportRef = Pick<Item, 'id' | 'name' | 'lat' | 'lng' | 'timezone'>

export interface FlightView {
  transport: Transport
  fromItem: AirportRef | null // 出發機場
  toItem: AirportRef | null // 抵達機場
}

// 列出本趟所有航班（mode='flight'）並補上起訖機場 item（功能 5）。
// 以兩段查詢拼裝（transports 有兩個指向 items 的外鍵，避免 embed 的關聯歧義）。
export async function listFlights(tripId: string): Promise<FlightView[]> {
  const { data, error } = await supabase
    .from('transports')
    .select('*')
    .eq('trip_id', tripId)
    .eq('mode', 'flight')
    .order('depart_local', { ascending: true, nullsFirst: false })
  if (error) throw error
  const flights = (data ?? []) as Transport[]
  if (flights.length === 0) return []

  const ids = [...new Set(flights.flatMap((f) => [f.from_item_id, f.to_item_id]))]
  const { data: itemRows, error: itemErr } = await supabase
    .from('items')
    .select('id,name,lat,lng,timezone')
    .in('id', ids)
  if (itemErr) throw itemErr
  const byId = new Map((itemRows ?? []).map((r) => [(r as AirportRef).id, r as AirportRef]))

  return flights.map((f) => ({
    transport: f,
    fromItem: byId.get(f.from_item_id) ?? null,
    toItem: byId.get(f.to_item_id) ?? null,
  }))
}

export interface UpsertTransportInput {
  trip_id: string
  from_item_id: string
  to_item_id: string
  mode: TransportMode
  duration_min?: number | null
  distance_m?: number | null
  custom_label?: string | null
  flight_no?: string | null
  cost_text?: string | null
  route_polyline?: string | null
  depart_local?: string | null
  depart_tz?: string | null
  arrive_local?: string | null
  arrive_tz?: string | null
  depart_terminal?: string | null
  arrive_terminal?: string | null
  steps?: TransitStep[] | null
  notes?: string | null
}

// 以 (from_item_id, to_item_id) 為鍵 upsert：一段交通一列。
// 唯一鍵見 schema.sql，兩人同時設定同一段時靠 onConflict 收斂成一列（不重複）。
export async function upsertTransport(input: UpsertTransportInput): Promise<Transport> {
  const { data, error } = await supabase
    .from('transports')
    .upsert(
      {
        trip_id: input.trip_id,
        from_item_id: input.from_item_id,
        to_item_id: input.to_item_id,
        mode: input.mode,
        duration_min: input.duration_min ?? null,
        distance_m: input.distance_m ?? null,
        custom_label: input.custom_label ?? null,
        flight_no: input.flight_no ?? null,
        cost_text: input.cost_text ?? null,
        route_polyline: input.route_polyline ?? null,
        depart_local: input.depart_local ?? null,
        depart_tz: input.depart_tz ?? null,
        arrive_local: input.arrive_local ?? null,
        arrive_tz: input.arrive_tz ?? null,
        depart_terminal: input.depart_terminal ?? null,
        arrive_terminal: input.arrive_terminal ?? null,
        steps: input.steps ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: 'from_item_id,to_item_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data as Transport
}

export async function removeTransport(id: string): Promise<void> {
  const { error } = await supabase.from('transports').delete().eq('id', id)
  if (error) throw error
}

export async function removeTransports(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('transports').delete().in('id', ids)
  if (error) throw error
}

// 重排／移動天之後，找出因「不再相鄰」而失效的交通段 id（供批次刪除）。
// flight 是機票功能的資料錨點、custom 有手填備註與連結文件——皆保留不清，
// 重新相鄰時可復用；殘留只是暫時看不到，屬刻意取捨。
export function danglingTransportIds(items: Item[], transports: Transport[]): string[] {
  const byDay = new Map<string, Item[]>()
  for (const it of items) {
    if (it.status !== 'scheduled' || !it.day_id) continue
    const arr = byDay.get(it.day_id)
    if (arr) arr.push(it)
    else byDay.set(it.day_id, [it])
  }
  const adjacent = new Set<string>()
  for (const arr of byDay.values()) {
    arr.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    for (let i = 0; i + 1 < arr.length; i++) adjacent.add(`${arr[i].id}|${arr[i + 1].id}`)
  }
  return transports
    .filter((t) => t.mode !== 'flight' && t.mode !== 'custom')
    .filter((t) => !adjacent.has(`${t.from_item_id}|${t.to_item_id}`))
    .map((t) => t.id)
}
