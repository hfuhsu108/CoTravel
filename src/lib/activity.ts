// 改動紀錄（階段 6）：寫入/讀取 activity_log，供「對方改動通知」（紅點 + banner + 最近改動清單）。
// 行李清單不記（勾選高頻會洗版，僅靠 Realtime 同步進度）——見 docs/03。
import { supabase } from './supabase'
import type { ActivityEntry } from './types'

export type ActivityAction =
  | 'item_add'
  | 'item_move'
  | 'item_remove'
  | 'candidate_add'
  | 'transport_set'
  | 'transport_remove'
  | 'doc_add'
  | 'doc_remove'

// fire-and-forget：通知紀錄失敗不應阻斷主要操作（主操作已成功），只留 console 線索。
// target_summary 存「不含人名的完整動作句」（如 把「梅田藍天大廈」加到 Day 2），
// UI 渲染時前面接 <b>名字</b>，banner 與最近改動清單共用同一句、免反查上下文。
export function logActivity(
  tripId: string,
  userId: string,
  action: ActivityAction,
  targetSummary: string,
): void {
  void supabase
    .from('activity_log')
    .insert({ trip_id: tripId, user_id: userId, action, target_summary: targetSummary })
    .then(({ error }) => {
      if (error) console.warn('[activity] 寫入 activity_log 失敗', error)
    })
}

// 最近改動（鈴鐺 sheet 用），新到舊
export async function listActivity(tripId: string, limit = 20): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ActivityEntry[]
}

// 對方最新一筆改動（初始化未讀紅點：與 localStorage 的 lastSeen 比對）
export async function getLatestForeignActivity(
  tripId: string,
  meId: string,
): Promise<ActivityEntry | null> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('trip_id', tripId)
    .neq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as ActivityEntry | null) ?? null
}
