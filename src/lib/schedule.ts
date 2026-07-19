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
  stayDefault: boolean // 停留用了「未設定→預設 1 小時」（功能：以 1 小時為預設計算）
  latestDeparture: number | null // 為趕上下一站手填抵達，本站最晚離開時刻（反推；無約束則 null）
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

const DEFAULT_STAY_MIN = 60 // 未設定停留時的預設值（功能：以 1 小時為預設進行計算）

// 依當天排序後的項目 + 相鄰交通，算每項的有效抵達/停留/離開（含手填旗標）。
// dayDate（'YYYY-MM-DD'）供跨站時間串接的時差修正（功能 4：相鄰站時區不同時加上偏移差）。
// tripTz：旅程主時區，作為無座標項目（item.timezone 為 null）的時差退路，避免跨時區誤算。
export function computeDaySchedule(
  ordered: Item[],
  transportByPair: Map<string, Transport>,
  dayDate?: string | null,
  tripTz?: string | null,
): Map<string, EffTime> {
  const out = new Map<string, EffTime>()
  let prev: { id: string; departure: number | null; tz: string | null } | null = null
  const atISO = dayDate ? `${dayDate}T12:00` : undefined

  // 兩站時差（分鐘）：抵達站 − 出發站；任一站無時區則退回旅程主時區；無參考日/同區回 0
  const tzDiff = (fromTz: string | null, toTz: string | null): number => {
    const f = fromTz ?? tripTz ?? null
    const t = toTz ?? tripTz ?? null
    if (!atISO || !f || !t || f === t) return 0
    return tzOffsetMinutes(t, atISO) - tzOffsetMinutes(f, atISO)
  }

  for (const item of ordered) {
    const aManual = parseHHMM(item.scheduled_time)
    const sManual = item.stay_minutes ?? null
    const dManual = parseHHMM(item.departure_time)

    let arrival = aManual
    let stay = sManual
    let departure = dManual
    let stayDefault = false

    // 跨站串接：抵達空 → 上站離開 + 交通分鐘 +（下站時區 − 上站時區）的時差
    if (arrival == null && prev && prev.departure != null) {
      const dur: number | null | undefined = transportByPair.get(`${prev.id}|${item.id}`)?.duration_min
      if (dur != null) arrival = prev.departure + dur + tzDiff(prev.tz, item.timezone)
    }

    // 跨午夜修正：串接後抵達可能已跨日（>=1440），手填離開/抵達只有 0–1439 的牆鐘值。
    // 把較小的手填值視為與跨日值同一天（加上跨日位移）再互補與串接，避免誤報「離開早於抵達」。
    // 抬升後仍早於抵達者（如抵達 01:00、離開填 00:30）屬真實矛盾，照常進入警告。
    if (departure != null && dManual != null && arrival != null && arrival >= 1440 && departure < arrival) {
      departure += Math.floor(arrival / 1440) * 1440
    }

    // 單站互補（含「未設定停留→預設 1 小時」）：
    // 有抵達無離開 → 離開 = 抵達 + (停留 ?? 60)；有離開無抵達 → 抵達 = 離開 − (停留 ?? 60)。
    if (arrival != null && departure == null) {
      if (stay == null) {
        stay = DEFAULT_STAY_MIN
        stayDefault = true
      }
      departure = arrival + stay
    } else if (arrival != null && departure != null && stay == null) {
      stay = departure - arrival
    } else if (arrival == null && departure != null) {
      if (stay == null) {
        stay = DEFAULT_STAY_MIN
        stayDefault = true
      }
      arrival = departure - stay
    }

    out.set(item.id, {
      arrival,
      stay,
      departure,
      arrivalManual: aManual != null,
      stayManual: sManual != null,
      departureManual: dManual != null,
      stayDefault,
      latestDeparture: null,
    })
    prev = { id: item.id, departure, tz: item.timezone }
  }

  // 反推「前一站最晚離開」：下一站抵達為手填、且兩站間有交通分鐘時，
  // 本站最晚離開 = 下站抵達 − 交通分鐘 −（下站時區 − 本站時區）。給趕路提醒用。
  for (let i = 0; i < ordered.length - 1; i++) {
    const cur = ordered[i]
    const next = ordered[i + 1]
    const nextEff = out.get(next.id)
    if (!nextEff?.arrivalManual || nextEff.arrival == null) continue
    const dur = transportByPair.get(`${cur.id}|${next.id}`)?.duration_min
    if (dur == null) continue
    const curEff = out.get(cur.id)
    if (curEff) curEff.latestDeparture = nextEff.arrival - dur - tzDiff(cur.timezone, next.timezone)
  }

  return out
}
