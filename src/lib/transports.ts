// 交通資料存取（階段 3）：transports 的 list / upsert / remove。
// 沿用 itinerary.ts 慣例：薄包裝 Supabase、出錯即 throw（訊息交給 errMessage 顯示）。
// RLS 已限定只有該趟成員可讀寫（見 supabase/schema.sql 的 "members rw transports"）。
import { supabase } from './supabase'
import type { Transport, TransportMode } from './types'

export async function listTransports(tripId: string): Promise<Transport[]> {
  const { data, error } = await supabase.from('transports').select('*').eq('trip_id', tripId)
  if (error) throw error
  return (data ?? []) as Transport[]
}

export interface UpsertTransportInput {
  trip_id: string
  from_item_id: string
  to_item_id: string
  mode: TransportMode
  duration_min?: number | null
  distance_m?: number | null
  custom_label?: string | null
  cost_text?: string | null
  route_polyline?: string | null
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
        cost_text: input.cost_text ?? null,
        route_polyline: input.route_polyline ?? null,
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
