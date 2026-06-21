// 行李分類（各自管理）資料存取。每人一份（owner_user_id 區分）；成員可讀、只有本人可寫。
// packing_items 以 category_id 參照本表；改名只動一列、夥伴端即時反映（不需逐筆改 items）。
import { supabase } from './supabase'
import type { PackingCategory } from './types'
import { PACK_CATEGORIES } from './packing'

// 某人在某趟的分類（看自己＝own；看夥伴傳其 id，RLS 允許讀）
export async function listCategories(tripId: string, ownerId: string): Promise<PackingCategory[]> {
  const { data, error } = await supabase
    .from('packing_categories')
    .select('*')
    .eq('trip_id', tripId)
    .eq('owner_user_id', ownerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PackingCategory[]
}

// 首次使用補建預設分類（該 owner 於該趟尚無分類時）。回傳補建後的清單。
export async function ensureDefaultCategories(
  tripId: string,
  ownerId: string,
): Promise<PackingCategory[]> {
  const existing = await listCategories(tripId, ownerId)
  if (existing.length > 0) return existing
  const rows = PACK_CATEGORIES.map((name, i) => ({
    trip_id: tripId,
    owner_user_id: ownerId,
    name,
    sort_order: i,
  }))
  const { error } = await supabase
    .from('packing_categories')
    .upsert(rows, { onConflict: 'trip_id,owner_user_id,name', ignoreDuplicates: true })
  if (error) throw error
  return listCategories(tripId, ownerId)
}

export async function addCategory(
  tripId: string,
  ownerId: string,
  name: string,
  sortOrder: number,
): Promise<PackingCategory> {
  const { data, error } = await supabase
    .from('packing_categories')
    .insert({ trip_id: tripId, owner_user_id: ownerId, name: name.trim(), sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data as PackingCategory
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('packing_categories')
    .update({ name: name.trim() })
    .eq('id', id)
  if (error) throw error
}

// 刪分類：FK on delete set null → 該分類的行李歸「未分類」
export async function removeCategory(id: string): Promise<void> {
  const { error } = await supabase.from('packing_categories').delete().eq('id', id)
  if (error) throw error
}
