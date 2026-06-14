// 時間防呆（功能 8）：全部軟性警告（warning + allow），不擋存檔。依推算後的有效時間判斷。
// 營業時間外另在 PlaceDetail 以即時抓的營業時間判斷（不在此，因 hours 未存 DB）。
import type { Item, Transport } from './types'
import { formatMin, type EffTime } from './schedule'

export function computeDayWarnings(
  ordered: Item[],
  transportByPair: Map<string, Transport>,
  schedule: Map<string, EffTime>,
  flightArrivalItemIds: Set<string>, // 當天「航班抵達機場」item（flight 交通的 to_item）
): Map<string, string[]> {
  const warn = new Map<string, string[]>()
  const add = (id: string, msg: string) => {
    const arr = warn.get(id) ?? []
    arr.push(msg)
    warn.set(id, arr)
  }

  // 當天航班最早落地時刻（供「排在落地前」判斷）
  let landing: number | null = null
  for (const it of ordered) {
    if (!flightArrivalItemIds.has(it.id)) continue
    const a = schedule.get(it.id)?.arrival
    if (a != null) landing = landing == null ? a : Math.min(landing, a)
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

    // 站間衝突：只在本站抵達為「手填」時判斷（推算值不會自相矛盾）
    if (i > 0 && eff.arrivalManual && eff.arrival != null) {
      const prev = ordered[i - 1]
      const pEff = schedule.get(prev.id)
      if (pEff?.departure != null) {
        if (eff.arrival < pEff.departure) {
          add(it.id, `抵達早於上一站離開（${formatMin(pEff.departure)}），時間倒流`)
        } else {
          const dur = transportByPair.get(`${prev.id}|${it.id}`)?.duration_min
          if (dur != null && eff.arrival < pEff.departure + dur) {
            add(it.id, `交通可能趕不上（最快約 ${formatMin(pEff.departure + dur)} 才到）`)
          }
        }
      }
    }

    // 排在當日航班落地之前
    if (
      landing != null &&
      !flightArrivalItemIds.has(it.id) &&
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
