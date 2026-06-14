// 清單（tags）批次管理（功能 3）：改名 / 刪除 / 合併。一個「清單」＝ items.tags 裡的一個字串。
// 對 2 人小資料量採「抓含該 tag 的 items、逐筆更新」（簡單可靠）。RLS 限該趟成員可寫。
import { supabase } from './supabase'

// 本趟所有清單（distinct tags，排序）
export async function listTripTags(tripId: string): Promise<string[]> {
  const { data, error } = await supabase.from('items').select('tags').eq('trip_id', tripId)
  if (error) throw error
  const s = new Set<string>()
  for (const r of data ?? []) for (const t of (r as { tags: string[] }).tags ?? []) s.add(t)
  return [...s].sort((a, b) => a.localeCompare(b))
}

// 改名 / 合併：把所有含 from 的 items 的該 tag 換成 to（去重）。合併＝to 已存在。
export async function renameTagAcrossTrip(
  tripId: string,
  from: string,
  to: string,
): Promise<void> {
  const target = to.trim()
  if (!target || target === from) return
  const { data, error } = await supabase
    .from('items')
    .select('id, tags')
    .eq('trip_id', tripId)
    .contains('tags', [from])
  if (error) throw error
  await Promise.all(
    (data ?? []).map((r) => {
      const row = r as { id: string; tags: string[] }
      const next = [...new Set(row.tags.map((t) => (t === from ? target : t)))]
      return supabase
        .from('items')
        .update({ tags: next })
        .eq('id', row.id)
        .then(({ error: e }) => {
          if (e) throw e
        })
    }),
  )
}

// 刪除清單：從所有含該 tag 的 items 移除（景點本身保留）
export async function deleteTagAcrossTrip(tripId: string, tag: string): Promise<void> {
  const { data, error } = await supabase
    .from('items')
    .select('id, tags')
    .eq('trip_id', tripId)
    .contains('tags', [tag])
  if (error) throw error
  await Promise.all(
    (data ?? []).map((r) => {
      const row = r as { id: string; tags: string[] }
      const next = row.tags.filter((t) => t !== tag)
      return supabase
        .from('items')
        .update({ tags: next })
        .eq('id', row.id)
        .then(({ error: e }) => {
          if (e) throw e
        })
    }),
  )
}
