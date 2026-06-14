// 三時間排程推算（功能 4）：抵達(scheduled_time)／停留(stay_minutes)／離開(departure_time)。
// 原則：DB 只存使用者手填值；有效時間於此即時推算，故永不覆寫手填值。
// 單站內 離開 = 抵達 + 停留（補空欄）；跨站 下站抵達 = 上站離開 + 交通分鐘（補空欄）。
import type { Item, Transport } from './types'
import { tzOffsetMinutes } from './time'

export interface EffTime {
  arrival: number | null // 距 00:00 的分鐘（跨站串接後可能 >1440）
  stay: number | null // 停留分鐘
  departure: number | null
  arrivalManual: boolean // 抵達為手填（非推算）
  stayManual: boolean
  departureManual: boolean
}

// 'HH:MM[:SS]' → 分鐘；無效回 null
export function parseHHMM(s: string | null | undefined): number | null {
  if (!s) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(s)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

// 分鐘 → 'HH:MM'（取 24h 模，處理跨午夜/負值）
export function formatMin(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return ''
  const v = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

// 依當天排序後的項目 + 相鄰交通，算每項的有效抵達/停留/離開（含手填旗標）。
// dayDate（'YYYY-MM-DD'）供跨站時間串接的時差修正（功能 4：相鄰站時區不同時加上偏移差）。
export function computeDaySchedule(
  ordered: Item[],
  transportByPair: Map<string, Transport>,
  dayDate?: string | null,
): Map<string, EffTime> {
  const out = new Map<string, EffTime>()
  let prev: { id: string; departure: number | null; tz: string | null } | null = null
  const atISO = dayDate ? `${dayDate}T12:00` : undefined

  for (const item of ordered) {
    const aManual = parseHHMM(item.scheduled_time)
    const sManual = item.stay_minutes ?? null
    const dManual = parseHHMM(item.departure_time)

    let arrival = aManual
    let stay = sManual
    let departure = dManual

    // 跨站串接：抵達空 → 上站離開 + 交通分鐘 +（下站時區 − 上站時區）的時差
    if (arrival == null && prev && prev.departure != null) {
      const dur: number | null | undefined = transportByPair.get(`${prev.id}|${item.id}`)?.duration_min
      if (dur != null) {
        let tzAdjust = 0
        if (atISO && prev.tz && item.timezone && prev.tz !== item.timezone) {
          tzAdjust = tzOffsetMinutes(item.timezone, atISO) - tzOffsetMinutes(prev.tz, atISO)
        }
        arrival = prev.departure + dur + tzAdjust
      }
    }
    // 單站三欄互補
    if (departure == null && arrival != null && stay != null) departure = arrival + stay
    else if (stay == null && arrival != null && departure != null) stay = departure - arrival
    else if (arrival == null && departure != null && stay != null) arrival = departure - stay
    // 抵達若於上一步補出，可能還能補離開
    if (departure == null && arrival != null && stay != null) departure = arrival + stay

    out.set(item.id, {
      arrival,
      stay,
      departure,
      arrivalManual: aManual != null,
      stayManual: sManual != null,
      departureManual: dManual != null,
    })
    prev = { id: item.id, departure, tz: item.timezone }
  }
  return out
}
