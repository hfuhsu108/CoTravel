// 清單（tags）批次管理（功能 3）：改名 / 刪除 / 合併。一個「清單」＝ items.tags 裡的一個字串。
// 走 DB 端 RPC 原子更新（array_replace / array_remove）：前端整包讀改寫在兩人同時編輯
// 同一 item 的 tags 時會 last-write-wins 互相覆蓋，RPC 在單一 UPDATE 內完成、無此競態。
// RLS（security invoker）限該趟成員可寫。函式定義見 supabase/schema.sql。
import { supabase } from './supabase'

// 改名 / 合併：把所有含 from 的 items 的該 tag 換成 to（DB 端保序去重）。合併＝to 已存在。
export async function renameTagAcrossTrip(
  tripId: string,
  from: string,
  to: string,
): Promise<void> {
  const target = to.trim()
  if (!target || target === from) return
  const { error } = await supabase.rpc('rename_tag_across_trip', {
    p_trip_id: tripId,
    p_from: from,
    p_to: target,
  })
  if (error) throw error
}

// 刪除清單：從所有含該 tag 的 items 移除（景點本身保留）
export async function deleteTagAcrossTrip(tripId: string, tag: string): Promise<void> {
  const { error } = await supabase.rpc('delete_tag_across_trip', {
    p_trip_id: tripId,
    p_tag: tag,
  })
  if (error) throw error
}
