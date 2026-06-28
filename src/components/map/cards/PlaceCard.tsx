import type { Item } from '../../../lib/types'
import { displayName } from '../../../lib/itinerary'
import { formatMin, type EffTime } from '../../../lib/schedule'
import { formatDurationZh } from '../../../lib/time'
import Icon from '../../Icon'

interface PlaceCardProps {
  item: Item
  n: number // 站序（當天定點編號）
  selected: boolean
  eff?: EffTime // 有效時間（抵達/離開；推算值以淡色顯示）
  hasWarning?: boolean // 有時間防呆提醒
  onSelect: () => void
}

// 定點卡（畫面 2 PlaceCard）：縮圖＋編號徽章、名稱、造訪時間 chip、清單 chip。
// 時間顯示有效「抵達–離開」（功能 4）；推算值（非手填）以淡色區隔。
export default function PlaceCard({ item, n, selected, eff, hasWarning, onSelect }: PlaceCardProps) {
  // 時間 chip：依「使用者實際手填了什麼」決定格式——抵達+離開→「10:00-11:00」；
  // 僅抵達→「10:00 抵達」；僅離開→「11:00 離開」。推算值（純串接、非手填）以淡色區隔。
  const A = eff?.arrival ?? null
  const D = eff?.departure ?? null
  const aMan = !!eff?.arrivalManual && A != null
  const dMan = !!eff?.departureManual && D != null
  const sMan = !!eff?.stayManual
  const showRange = A != null && D != null && ((aMan && (dMan || sMan)) || (dMan && sMan))
  let timeLabel: string | null = null
  let timeDerived = false
  if (showRange) timeLabel = `${formatMin(A)}-${formatMin(D)}`
  else if (aMan) timeLabel = `${formatMin(A)} 抵達`
  else if (dMan) timeLabel = `${formatMin(D)} 離開`
  else if (A != null) {
    timeLabel = `${formatMin(A)} 抵達`
    timeDerived = true
  } else if (D != null) {
    timeLabel = `${formatMin(D)} 離開`
    timeDerived = true
  } else if (item.scheduled_time) timeLabel = item.scheduled_time.slice(0, 5)
  // 停留一律顯示（功能：未設定以 1 小時預設計算，stayDefault 時淡色標示）
  const stayLabel = eff?.stay != null ? `停留 ${formatDurationZh(eff.stay)}` : null
  return (
    <div
      onClick={onSelect}
      className="flex cursor-pointer items-center gap-[11px] rounded-lg bg-surface p-[10px] transition-shadow"
      style={{ boxShadow: selected ? '0 0 0 2px var(--primary), var(--sh-2)' : 'var(--sh-1)' }}
    >
      <div className="relative flex-none">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={displayName(item)}
            className="h-[58px] w-[58px] rounded-[14px] object-cover"
          />
        ) : (
          <div className="ph h-[58px] w-[58px] rounded-[14px]" />
        )}
        <span
          className="num absolute -left-[7px] -top-[7px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary text-[13px] font-extrabold text-white"
        >
          {n}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-extrabold">{displayName(item)}</div>
        <div className="mt-[3px] flex flex-wrap items-center gap-2">
          {timeLabel && (
            <span
              className={`num flex items-center gap-1 rounded-full px-2 py-[2px] text-xs font-bold ${
                timeDerived ? 'bg-line text-ink-3' : 'bg-primary-soft text-primary-deep'
              }`}
              title={timeDerived ? '系統推算時間' : undefined}
            >
              <Icon name="clock" size={12} />
              {timeLabel}
            </span>
          )}
          {stayLabel && (
            <span
              className={`num flex items-center gap-1 rounded-full bg-line px-2 py-[2px] text-xs font-bold ${
                eff?.stayDefault ? 'text-ink-3' : 'text-ink-2'
              }`}
              title={eff?.stayDefault ? '未設定停留，預設以 1 小時計算' : undefined}
            >
              {stayLabel}
            </span>
          )}
          {/* 住宿膠囊移到時間/停留之後，讓抵達時間 chip 在各卡片左緣對齊 */}
          {item.lodging_id && (
            <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-[2px] text-[11px] font-bold text-primary-deep">
              <Icon name="bed" size={12} /> 住宿
            </span>
          )}
          {hasWarning && (
            <span className="rounded-full bg-warn-soft px-[8px] py-[2px] text-[11px] font-bold text-[#b9762a]">
              提醒
            </span>
          )}
          {item.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-line px-2 py-[2px] text-[11px] font-bold text-ink-2"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
