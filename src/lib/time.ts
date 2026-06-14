// 時區基礎（功能 5）：一律以「當地時間 + IANA 時區」儲存，需要時才換算成絕對時刻（UTC）。
// 跨國搭飛機時，起訖在不同時區；用座標自動推時區（tz-lookup，離線、不需 Google Time Zone API），
// 飛行時數由兩端的絕對時刻相減得出。toInstantUTC 為未來的登機/訂位通知預留（可算出該提醒的 UTC 時刻）。
import { DateTime } from 'luxon'
import tzlookup from 'tz-lookup'

// 由經緯度推 IANA 時區（如 'Asia/Tokyo'）；無座標或查不到回 null。
export function tzForCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (lat == null || lng == null) return null
  try {
    return tzlookup(lat, lng)
  } catch {
    return null
  }
}

// 當地時間（'YYYY-MM-DD' 或 'YYYY-MM-DDTHH:MM'）+ IANA 時區 → UTC ISO 字串（未來通知用）。
export function toInstantUTC(localISO: string, tz: string): string | null {
  const dt = DateTime.fromISO(localISO, { zone: tz })
  return dt.isValid ? dt.toUTC().toISO() : null
}

// 兩端各自的當地時間 + 時區 → 實際飛行/移動分鐘數（跨時區也正確）。
export function spanMinutes(
  departLocal: string,
  departTz: string,
  arriveLocal: string,
  arriveTz: string,
): number | null {
  const dep = DateTime.fromISO(departLocal, { zone: departTz })
  const arr = DateTime.fromISO(arriveLocal, { zone: arriveTz })
  if (!dep.isValid || !arr.isValid) return null
  const mins = arr.diff(dep, 'minutes').minutes
  return Number.isFinite(mins) ? Math.round(mins) : null
}

// 分鐘 → 「11 小時 30 分」/「45 分」（負值或無效回 '—'）。
export function formatDurationZh(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min) || min < 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} 分`
  if (m === 0) return `${h} 小時`
  return `${h} 小時 ${m} 分`
}

// IANA 時區的城市片段（'America/Los_Angeles' → 'Los Angeles'）。
export function tzCity(tz: string): string {
  const seg = tz.split('/').pop() ?? tz
  return seg.replace(/_/g, ' ')
}

// 時區的 UTC 偏移標籤（'Asia/Tokyo' → 'UTC+9'；'Asia/Kolkata' → 'UTC+5:30'）。
// atISO 指定參考日期（處理夏令時）；省略則用現在。
export function tzOffsetLabel(tz: string, atISO?: string): string {
  const dt = atISO ? DateTime.fromISO(atISO, { zone: tz }) : DateTime.now().setZone(tz)
  if (!dt.isValid) return ''
  const off = dt.toFormat('ZZ') // 例：'+09:00'、'-07:00'
  const m = off.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!m) return `UTC${off}`
  const sign = m[1]
  const hh = Number.parseInt(m[2], 10)
  const mm = m[3]
  return mm === '00' ? `UTC${sign}${hh}` : `UTC${sign}${hh}:${mm}`
}

// 城市 + 偏移的合併標籤（'Tokyo · UTC+9'）。
export function tzLabel(tz: string, atISO?: string): string {
  return `${tzCity(tz)} · ${tzOffsetLabel(tz, atISO)}`
}

// 時區在某日期的 UTC 偏移分鐘數（功能 4：跨站時間串接的時差修正）。atISO 省略則用現在。
export function tzOffsetMinutes(tz: string, atISO?: string): number {
  const dt = atISO ? DateTime.fromISO(atISO, { zone: tz }) : DateTime.now().setZone(tz)
  return dt.isValid ? dt.offset : 0
}

// 兩地時差（功能 5）：抵達地相對出發地（'+1 小時' / '-16 小時' / '同時區'）。
// atISO 指定參考日期（處理夏令時）；省略則用現在。正值＝抵達地時鐘較快。
export function tzOffsetDiffLabel(fromTz: string, toTz: string, atISO?: string): string {
  const inst = atISO ? DateTime.fromISO(atISO) : DateTime.now()
  if (!inst.isValid) return ''
  const diffMin = inst.setZone(toTz).offset - inst.setZone(fromTz).offset
  if (diffMin === 0) return '同時區'
  const sign = diffMin > 0 ? '+' : '-'
  const abs = Math.abs(diffMin)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const hm = m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`
  return `${sign}${hm}`
}
