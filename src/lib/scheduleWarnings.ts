// 時間防呆（功能 8）：全部軟性警告（warning + allow），不擋存檔。依推算後的有效時間判斷。
// 營業時間外另在 PlaceDetail 以即時抓的營業時間判斷（不在此，因 hours 未存 DB）。
import type { Item, Transport } from './types'
import { formatMin, type EffTime } from './schedule'
import { tzOffsetMinutes } from './time'

export function computeDayWarnings(
  ordered: Item[],
  transportByPair: Map<string, Transport>,
  schedule: Map<string, EffTime>,
  flightArrivalItemIds: Set<string>, // 當天「航班抵達機場」item（flight 交通的 to_item）
  dayDate?: string | null, // 跨站時間比較的時差修正參考日（處理 DST；同 computeDaySchedule）
  tripTz?: string | null, // 無座標項目的時差退路（同 computeDaySchedule）
): Map<string, string[]> {
  const warn = new Map<string, string[]>()
  const atISO = dayDate ? `${dayDate}T12:00` : undefined
  const add = (id: string, msg: string) => {
    const arr = warn.get(id) ?? []
    arr.push(msg)
    warn.set(id, arr)
  }

  // 當天最後一個「航班抵達機場」的位置與其落地時刻。
  // 只有排在它之後（目的地側）的項目才該被「落地前」判斷：起飛機場與所有 origin 側
  // 項目本就在落地前、且與目的地分屬不同時區，牆鐘相比無意義，不該誤報（功能 1 修正）。
  let lastArrivalIdx = -1
  let landing: number | null = null
  for (let i = 0; i < ordered.length; i++) {
    if (!flightArrivalItemIds.has(ordered[i].id)) continue
    lastArrivalIdx = i
    landing = schedule.get(ordered[i].id)?.arrival ?? null
  }

  for (let i = 0; i < ordered.length; i++) {
    const it = ordered[i]
    const eff = schedule.get(it.id)
    if (!eff) continue

    // 同站矛盾
    if (eff.arrival != null && eff.departure != null && eff.departure < eff.arrival) {
      add(it.id, '離開時間早於抵達時間')
    }
    if (eff.stay != null && eff.stay <= 0) {
      add(it.id, '停留時間為 0 或負值')
    }

    // 站間衝突：只在本站抵達為「手填」時判斷（推算值不會自相矛盾）。
    // 跨時區關鍵：上一站離開是「上一站當地時間」、本站抵達是「本站當地時間」，直接相比會錯；
    // 須把上一站離開換算到本站時區（加兩站時差）再比，與 computeDaySchedule 的串接同規則。
    if (i > 0 && eff.arrivalManual && eff.arrival != null) {
      const prev = ordered[i - 1]
      const pEff = schedule.get(prev.id)
      if (pEff?.departure != null) {
        let tzAdjust = 0
        const ptz = prev.timezone ?? tripTz ?? null
        const itz = it.timezone ?? tripTz ?? null
        if (atISO && ptz && itz && ptz !== itz) {
          tzAdjust = tzOffsetMinutes(itz, atISO) - tzOffsetMinutes(ptz, atISO)
        }
        const prevDepHere = pEff.departure + tzAdjust // 上一站離開，換算到本站時區的牆鐘
        // 跨午夜修正：上一站離開可能已跨日（>=1440），手填抵達只有 0–1439 的牆鐘值，
        // 視為同一天（加上跨日位移）再比，避免誤報時間倒流（同 computeDaySchedule 規則）
        let arrivalCmp = eff.arrival
        if (arrivalCmp < prevDepHere && prevDepHere >= 1440) {
          arrivalCmp += Math.floor(prevDepHere / 1440) * 1440
        }
        if (arrivalCmp < prevDepHere) {
          add(it.id, `抵達早於上一站離開（${formatMin(prevDepHere)}），時間倒流`)
        } else {
          const dur = transportByPair.get(`${prev.id}|${it.id}`)?.duration_min
          if (dur != null && arrivalCmp < prevDepHere + dur) {
            add(it.id, `交通可能趕不上（最快約 ${formatMin(prevDepHere + dur)} 才到）`)
          }
        }
      }
    }

    // 排在當日航班落地之前（只查落地之後的目的地側項目；origin 側不誤報）
    if (
      landing != null &&
      i > lastArrivalIdx &&
      eff.arrival != null &&
      eff.arrival < landing
    ) {
      add(it.id, `排在航班落地（${formatMin(landing)}）之前`)
    }
  }
  return warn
}

// 日期是否落在旅程日期範圍外（航班/住宿卡用；start/end 為 'YYYY-MM-DD' 或 null）
export function isDateOutsideTrip(
  date: string | null,
  tripStart: string | null,
  tripEnd: string | null,
): boolean {
  if (!date) return false
  if (tripStart && date < tripStart) return true
  if (tripEnd && date > tripEnd) return true
  return false
}
