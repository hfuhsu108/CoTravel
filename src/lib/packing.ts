// 行李清單資料存取（階段 5）：packing_items 的 list / add / 勾選 / remove。
// 沿用 transports.ts 慣例：薄包裝 Supabase、出錯即 throw（訊息交給 errMessage 顯示）。
// RLS：成員互看（select），但只有 owner_user_id 本人能寫（見 schema.sql "owner write packing"）。
import { supabase } from './supabase'
import type { PackingItem } from './types'

// 分類固定清單（對應 prototype AddPackSheet 的 select 選項；分組顯示也照此順序）
export const PACK_CATEGORIES = ['證件', '電子產品', '盥洗', '衣物', '其他'] as const

export async function listPackingItems(tripId: string): Promise<PackingItem[]> {
  const { data, error } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PackingItem[]
}

export async function addPackingItem(input: {
  trip_id: string
  owner_user_id: string
  name: string
  category: string
}): Promise<PackingItem> {
  const { data, error } = await supabase
    .from('packing_items')
    .insert({
      trip_id: input.trip_id,
      owner_user_id: input.owner_user_id,
      name: input.name,
      category: input.category,
    })
    .select()
    .single()
  if (error) throw error
  return data as PackingItem
}

export async function setPackingPacked(id: string, isPacked: boolean): Promise<void> {
  const { error } = await supabase.from('packing_items').update({ is_packed: isPacked }).eq('id', id)
  if (error) throw error
}

export async function removePackingItem(id: string): Promise<void> {
  const { error } = await supabase.from('packing_items').delete().eq('id', id)
  if (error) throw error
}
