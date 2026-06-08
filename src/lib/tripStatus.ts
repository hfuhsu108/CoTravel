// 由旅程起訖日對「今天」推導狀態、badge 文案與日期顯示。純函式，與 React 無關，便於單測。

export type TripStatus = 'ongoing' | 'upcoming' | 'past'

interface DateRange {
  start_date: string | null
  end_date: string | null
}

// 本地「今天」的 YYYY-MM-DD（用本地時區，避免 UTC 換算把日期跨掉）
export function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 兩個 YYYY-MM-DD 相差天數（a - b）。用 UTC 毫秒避免 DST 誤差。
function dayDiff(aYmd: string, bYmd: string): number {
  const toUtc = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(aYmd) - toUtc(bYmd)) / 86_400_000)
}

// 'YYYY-MM-DD'（字串可直接字典序比較大小，等同日期先後）
export function getTripStatus(trip: DateRange, today: string = todayYmd()): TripStatus {
  const { start_date, end_date } = trip
  if (end_date && end_date < today) return 'past'
  if (start_date && start_date <= today && (!end_date || end_date >= today)) return 'ongoing'
  // 出發日在未來、或日期未填 → 即將出發 / 規劃中
  return 'upcoming'
}

export function getTripBadge(trip: DateRange, today: string = todayYmd()): string {
  const status = getTripStatus(trip, today)
  if (status === 'past') return '已結束'
  if (status === 'ongoing') {
    if (trip.start_date) return `進行中・Day ${dayDiff(today, trip.start_date) + 1}`
    return '進行中'
  }
  // upcoming
  if (trip.start_date) {
    const n = dayDiff(trip.start_date, today)
    return n <= 0 ? '即將出發' : `還有 ${n} 天`
  }
  return '規劃中'
}

function formatYmd(ymd: string): string {
  return ymd.replace(/-/g, '/')
}

// 日期區間顯示：同年時結束日省略年份。對應 prototype「2026/07/12 – 07/16」。
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '日期未定'
  if (start && !end) return formatYmd(start)
  if (!start && end) return formatYmd(end)
  const s = start as string
  const e = end as string
  const sameYear = s.slice(0, 4) === e.slice(0, 4)
  return `${formatYmd(s)} – ${sameYear ? formatYmd(e).slice(5) : formatYmd(e)}`
}

// 排序鍵：即將出發依出發日近→遠；過往依結束日新→舊。無日期者排後。
export function startSortKey(trip: DateRange): string {
  return trip.start_date ?? '9999-99-99'
}
export function endSortKey(trip: DateRange): string {
  return trip.end_date ?? '0000-00-00'
}
