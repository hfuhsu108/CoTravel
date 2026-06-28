// 景點清單 metadata（功能擴充）：清單本體仍是 items.tags 的「名稱」（保留多清單歸屬與
// 既有改名/合併邏輯）；本表以 (trip_id, name) 為鍵掛 icon/顏色，供地圖 marker 顯示。
// 改名/刪除時連同 items 的 tag 一起改（重用 lists.ts 的 tag 變更）。
import { supabase } from './supabase'
import type { BookmarkList } from './types'
import type { IconName } from '../components/Icon'
import { deleteTagAcrossTrip, renameTagAcrossTrip } from './lists'

// 清單可選 icon（Icon 集精選子集）與顏色色票（簡潔，不做全色盤）
export const LIST_ICONS: IconName[] = [
  // 美食飲品
  'food',
  'coffee',
  'wine',
  'icecream',
  'pizza',
  'bowl',
  // 自然戶外
  'mountain',
  'beach',
  'tree',
  'water',
  'camp',
  'seedling',
  // 文化古蹟
  'landmark',
  'torii',
  'monument',
  'museum',
  'palette',
  // 購物娛樂
  'mall',
  'ferris',
  'shopping',
  'gift',
  'gem',
  // 住宿休憩
  'bed',
  'onsen',
  'spa',
  'tent',
  // 交通移動
  'walk',
  'train',
  'car',
  'ferry',
  'bicycle',
  // 攝影紀念
  'camera',
  'cameraRetro',
  'panorama',
  'binoculars',
  // 通用收藏
  'heart',
  'star',
  'bookmark',
  'flag',
  'compass',
]
export const LIST_COLORS = [
  '#f08fb0',
  '#c770e0',
  '#7a6cf0',
  '#4a90e8',
  '#3bb98f',
  '#58c47a',
  '#d4c030',
  '#f0a04b',
  '#e8607a',
  '#8a8a8a',
]
export const DEFAULT_LIST_ICON: IconName = 'heart'
export const DEFAULT_LIST_COLOR = '#f08fb0'

// icon 字串可能來自 DB 的舊值/未知值 → 收斂回合法 IconName，否則回退預設
export function safeListIcon(icon: string | null | undefined): IconName {
  return icon && (LIST_ICONS as string[]).includes(icon) ? (icon as IconName) : DEFAULT_LIST_ICON
}

export async function listBookmarkLists(tripId: string): Promise<BookmarkList[]> {
  const { data, error } = await supabase
    .from('bookmark_lists')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as BookmarkList[]
}

// 旅程中 items 實際用到的所有清單名（distinct）；供設定頁自我修復缺漏的 metadata 列
export async function listInUseTags(tripId: string): Promise<string[]> {
  const { data, error } = await supabase.from('items').select('tags').eq('trip_id', tripId)
  if (error) throw error
  const s = new Set<string>()
  for (const r of data ?? []) for (const t of (r as { tags: string[] }).tags ?? []) s.add(t)
  return [...s]
}

// 建立書籤選到新清單名時補建預設列（冪等：unique(trip_id,name) 擋重複）
export async function ensureListsExist(tripId: string, names: string[]): Promise<void> {
  const rows = names
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .map((name) => ({ trip_id: tripId, name }))
  if (rows.length === 0) return
  const { error } = await supabase
    .from('bookmark_lists')
    .upsert(rows, { onConflict: 'trip_id,name', ignoreDuplicates: true })
  if (error) throw error
}

export async function createBookmarkList(
  tripId: string,
  input: { name: string; icon: string; color: string },
): Promise<BookmarkList> {
  const { data, error } = await supabase
    .from('bookmark_lists')
    .insert({ trip_id: tripId, name: input.name.trim(), icon: input.icon, color: input.color })
    .select()
    .single()
  if (error) throw error
  return data as BookmarkList
}

// 只改 icon/顏色（不動名稱）
export async function setListStyle(
  id: string,
  patch: { icon?: string; color?: string },
): Promise<void> {
  const { error } = await supabase.from('bookmark_lists').update(patch).eq('id', id)
  if (error) throw error
}

// 改名（或合併到既有名）：同步 metadata 列與所有 items 的 tag。
// 先動 metadata（單列、原子）：嘗試純改名；撞唯一鍵（23505，代表 target 並發已存在）→ 合併＝刪來源列。
// tag 同步放最後：即使該步失敗，metadata 仍自洽（不會出現「tag 改了但 metadata 對不上」的半套狀態）。
export async function renameBookmarkList(tripId: string, from: string, to: string): Promise<void> {
  const target = to.trim()
  if (!target || target === from) return

  const { error } = await supabase
    .from('bookmark_lists')
    .update({ name: target })
    .eq('trip_id', tripId)
    .eq('name', from)
  if (error) {
    if (error.code === '23505') {
      const { error: delErr } = await supabase
        .from('bookmark_lists')
        .delete()
        .eq('trip_id', tripId)
        .eq('name', from)
      if (delErr) throw delErr
    } else {
      throw error
    }
  }

  await renameTagAcrossTrip(tripId, from, target)
}

// 刪除清單：移除所有 items 的該 tag（景點保留）＋刪 metadata 列
export async function deleteBookmarkList(tripId: string, name: string): Promise<void> {
  await deleteTagAcrossTrip(tripId, name)
  const { error } = await supabase
    .from('bookmark_lists')
    .delete()
    .eq('trip_id', tripId)
    .eq('name', name)
  if (error) throw error
}
