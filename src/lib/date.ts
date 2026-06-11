// 日期顯示小工具。DB 的日期欄位皆為 'YYYY-MM-DD' 字串，這裡只做純字串/本地解析格式化。
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']

function parts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { y, m, d }
}

// '2026-07-13' → '7/13 日'（Day 分頁 / 側欄標題用）
export function formatDayLabel(dateStr: string): string {
  const { y, m, d } = parts(dateStr)
  const wd = WEEKDAY[new Date(y, m - 1, d).getDay()]
  return `${m}/${d} ${wd}`
}

// timestamptz ISO 字串 → 相對時間（通知清單用）。超過 7 天直接顯示日期，避免「53 天前」這種沒資訊量的字
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return '剛剛'
  if (min < 60) return `${min} 分鐘前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小時前`
  const day = Math.floor(hr / 24)
  if (day <= 7) return `${day} 天前`
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 旅程日期區間：'7/12 – 7/16'；缺值回 null
export function formatRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) {
    const s = parts(start)
    const e = parts(end)
    return `${s.m}/${s.d} – ${e.m}/${e.d}`
  }
  const only = parts((start ?? end) as string)
  return `${only.m}/${only.d}`
}
