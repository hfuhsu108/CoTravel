// 旅程改期（颱風等突發改期用）：改 trips 日期時同步 days。
// 原則：Day N 的內容原封不動、只重新對應日期（整段行程跟著新出發日平移）；
// 變長在尾端補空天；變短把被移除天上的項目退回書籤（不刪資料），
// 唯住宿自動產生的項目（lodging_auto）直接刪——它們是衍生資料，編輯住宿會重建。
// 住宿（check_in/check_out）與機票日期不自動平移：真實訂位改期通常要重訂，
// 由使用者到文件匣編輯，編輯時本來就會自動重排到正確的天。
import { supabase } from './supabase'
import { updateTrip, type TripPatch } from './api'
import { logActivity } from './activity'
import { dedupeDays, eachDate, listDays } from './itinerary'
import { formatRange } from './date'
import type { Day, Trip } from './types'

interface DaysSyncPlan {
  newDates: string[] // 新範圍每天的 'YYYY-MM-DD'
  days: Day[] // 現有 days（去重、依 day_index 排序）
  removedDays: Day[] // 超出新天數、將被刪除的 days
  moveCount: number // 退回書籤的項目數（不含住宿自動項目）
  lodgingAutoCount: number // 直接刪除的住宿自動項目數
}

function datesForRange(start: string | null, end: string | null): string[] {
  if (start && end) return eachDate(start, end)
  if (start) return [start]
  return []
}

// 試算同步計畫（不寫入）：給縮短天數時的確認訊息用。
// 回 null 表示無需同步（新日期為空，保守起見保留現有 days，不做任何變更）。
async function planDaysSync(
  tripId: string,
  start: string | null,
  end: string | null,
): Promise<DaysSyncPlan | null> {
  const newDates = datesForRange(start, end)
  if (newDates.length === 0) return null

  const days = dedupeDays(await listDays(tripId))
  const removedDays = days.length > newDates.length ? days.slice(newDates.length) : []

  let moveCount = 0
  let lodgingAutoCount = 0
  if (removedDays.length > 0) {
    const { data, error } = await supabase
      .from('items')
      .select('id, lodging_auto')
      .in(
        'day_id',
        removedDays.map((d) => d.id),
      )
    if (error) throw error
    for (const row of (data ?? []) as { id: string; lodging_auto: boolean }[]) {
      if (row.lodging_auto) lodgingAutoCount++
      else moveCount++
    }
  }
  return { newDates, days, removedDays, moveCount, lodgingAutoCount }
}

// 依計畫寫入：改日期 → 補尾天 → 處理被移除天（項目退書籤/刪住宿自動項）→ 刪 day 列。
// 中途失敗直接 throw（UI 顯示錯誤）；重存會重新試算，殘留的半套狀態可被下一次同步補正。
async function applyDaysSync(tripId: string, plan: DaysSyncPlan): Promise<void> {
  const { newDates, days, removedDays } = plan

  // 1) 既有天重對應日期（只寫有變的）
  const keepCount = Math.min(days.length, newDates.length)
  await Promise.all(
    days.slice(0, keepCount).flatMap((d, i) =>
      d.date === newDates[i]
        ? []
        : [
            supabase
              .from('days')
              .update({ date: newDates[i] })
              .eq('id', d.id)
              .then(({ error }) => {
                if (error) throw error
              }),
          ],
    ),
  )

  // 2) 變長：尾端補空天（撞 23505 視為對方已建，略過）
  if (newDates.length > days.length) {
    const rows = newDates
      .slice(days.length)
      .map((date, i) => ({ trip_id: tripId, date, day_index: days.length + i + 1 }))
    const { error } = await supabase.from('days').insert(rows)
    if (error && error.code !== '23505') throw error
  }

  // 3) 變短：被移除天上的項目就地重查（確認到寫入之間對方可能又加了項目，不能只信計畫快照）
  if (removedDays.length > 0) {
    const removedIds = removedDays.map((d) => d.id)

    const delRes = await supabase
      .from('items')
      .delete()
      .in('day_id', removedIds)
      .eq('lodging_auto', true)
    if (delRes.error) throw delRes.error

    const moveRes = await supabase
      .from('items')
      .update({ day_id: null, status: 'bookmark', is_bookmarked: true })
      .in('day_id', removedIds)
    if (moveRes.error) throw moveRes.error

    const dayRes = await supabase.from('days').delete().in('id', removedIds)
    if (dayRes.error) throw dayRes.error
  }
}

export interface TripDatesSaveResult {
  trip: Trip
  synced: boolean // 本次有無同步 days（含修復「先前只改了 trips 日期、days 沒跟上」的旅程）
  movedToBookmark: number
}

// 儲存旅程（設定頁與列表「修改行程」共用）。
// 同步與否不看「這次表單有沒有改日期」，而是看「days 是否吻合旅程的日期範圍」——
// 否則改期功能上線前已把日期存進 trips 的旅程，再按儲存會被誤判「沒變」而永遠不補天。
// 回 null 表示使用者在縮短天數的確認訊息按了取消（未做任何變更）。
export async function saveTripWithDaySync(
  prev: Pick<Trip, 'id' | 'start_date' | 'end_date'>,
  patch: TripPatch,
  userId: string | null,
): Promise<TripDatesSaveResult | null> {
  // patch 沒帶日期鍵時視為「不變」，避免被誤判成清除日期
  const newStart = 'start_date' in patch ? (patch.start_date ?? null) : (prev.start_date ?? null)
  const newEnd = 'end_date' in patch ? (patch.end_date ?? null) : (prev.end_date ?? null)
  const datesChanged =
    newStart !== (prev.start_date ?? null) || newEnd !== (prev.end_date ?? null)

  const plan = await planDaysSync(prev.id, newStart, newEnd)
  if (!plan) {
    // 新日期為空：不動 days（保守保留現況）
    const trip = await updateTrip(prev.id, patch)
    if (datesChanged && userId) logActivity(prev.id, userId, 'trip_update', '清除了旅程日期')
    return { trip, synced: false, movedToBookmark: 0 }
  }

  const needsSync =
    plan.removedDays.length > 0 ||
    plan.newDates.length > plan.days.length ||
    plan.days.some((d, i) => i < plan.newDates.length && d.date !== plan.newDates[i])

  if (needsSync && plan.removedDays.length > 0) {
    const parts = [
      `旅程將縮短為 ${plan.newDates.length} 天，Day ${plan.newDates.length + 1} 起共 ${plan.removedDays.length} 天會移除。`,
    ]
    if (plan.moveCount > 0) parts.push(`其上 ${plan.moveCount} 個行程項目會退回書籤（不會刪除）。`)
    if (plan.lodgingAutoCount > 0)
      parts.push(`${plan.lodgingAutoCount} 個住宿項目會移除（編輯住宿可重建）。`)
    parts.push('確定變更日期？')
    if (!window.confirm(parts.join('\n'))) return null
  }

  const trip = await updateTrip(prev.id, patch)
  if (needsSync) await applyDaysSync(prev.id, plan)

  // 表單日期有變、或實際動到 days（修復情境對方也看得到日期變了），都通知對方
  if ((datesChanged || needsSync) && userId) {
    const range = formatRange(newStart, newEnd)
    logActivity(prev.id, userId, 'trip_update', `把旅程日期改為 ${range ?? '未定'}`)
  }

  return { trip, synced: needsSync, movedToBookmark: needsSync ? plan.moveCount : 0 }
}
