import { Fragment, useMemo, useState } from 'react'
import type { AreaCandidate, Day, Item, Transport, TripWithMembers } from '../../lib/types'
import { computeDaySchedule } from '../../lib/schedule'
import { tzForCoords } from '../../lib/time'
import { formatDayLabel, formatRange } from '../../lib/date'
import Icon from '../Icon'
import PlaceCard from './cards/PlaceCard'
import AreaCard from './cards/AreaCard'
import TransitRow from './TransitRow'

interface OfflineItineraryProps {
  trip: TripWithMembers | null
  days: Day[]
  items: Item[]
  candidates: AreaCandidate[]
  transports: Transport[]
}

// 唯讀，互動回呼全給 no-op（離線不寫資料、不開即時地圖/路線）
const noop = () => {}

function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// 離線唯讀行程（階段 7）：MapTab 偵測無網路時改顯此元件。
// 只呈現「行程文字＋交通」——地圖、搜尋、即時路線仍需網路（使用者已接受取捨）。
// 直接複用展示型卡片（PlaceCard/AreaCard/TransitRow，本身不含 DnD hook），故不包 DndContext。
export default function OfflineItinerary({
  trip,
  days,
  items,
  candidates,
  transports,
}: OfflineItineraryProps) {
  const [currentDayId, setCurrentDayId] = useState<string | null>(
    () => days.find((d) => d.date === todayStr())?.id ?? days[0]?.id ?? null,
  )

  const candidatesByItem = useMemo(() => {
    const m = new Map<string, AreaCandidate[]>()
    for (const c of candidates) {
      const arr = m.get(c.item_id) ?? []
      arr.push(c)
      m.set(c.item_id, arr)
    }
    return m
  }, [candidates])

  const transportByPair = useMemo(() => {
    const m = new Map<string, Transport>()
    for (const t of transports) m.set(`${t.from_item_id}|${t.to_item_id}`, t)
    return m
  }, [transports])

  const currentDay = days.find((d) => d.id === currentDayId) ?? null
  const dayItems = useMemo(
    () =>
      items
        .filter((i) => i.status === 'scheduled' && i.day_id === currentDayId)
        .sort((a, b) => a.order_index - b.order_index),
    [items, currentDayId],
  )
  const tripTz = useMemo(
    () => tzForCoords(trip?.dest_lat ?? null, trip?.dest_lng ?? null),
    [trip?.dest_lat, trip?.dest_lng],
  )
  const daySchedule = useMemo(
    () => computeDaySchedule(dayItems, transportByPair, currentDay?.date ?? null, tripTz),
    [dayItems, transportByPair, currentDay?.date, tripTz],
  )

  // 編號只算定點（依 order_index）；區域不給編號
  const points = dayItems.filter((i) => i.type === 'point')
  const numberOf = new Map(points.map((p, i) => [p.id, i + 1]))

  const dateRange = formatRange(trip?.start_date ?? null, trip?.end_date ?? null)
  const hasCache = !!trip && days.length > 0

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* 標題列：旅程名 + 日期 + 離線徽章 */}
      <div className="flex flex-none items-start justify-between px-4 pb-2 pt-3">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-bold tracking-[-0.02em]">{trip?.name ?? '行程'}</h1>
          {dateRange && <div className="num text-[12.5px] font-semibold text-ink-3">{dateRange}</div>}
        </div>
        <span
          className="ml-2 inline-flex flex-none items-center gap-[6px] rounded-[13px] border px-3 py-2 text-[12.5px] font-bold"
          style={{ color: '#b9762a', background: 'var(--warn-soft)', borderColor: '#f3dcc0' }}
        >
          <Icon name="cloudoff" size={16} /> 離線中
        </span>
      </div>

      {hasCache && (
        <>
          <div className="flex flex-none gap-[7px] overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {days.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setCurrentDayId(d.id)}
                className={`flex flex-none flex-col items-center rounded-[13px] px-[13px] py-[7px] text-[13px] font-bold leading-[1.25] shadow-1 transition-all ${
                  d.id === currentDayId ? 'bg-primary text-white' : 'bg-white text-ink-2'
                }`}
              >
                <span className="num">Day {d.day_index}</span>
                <span className="num text-[10.5px] font-semibold opacity-85">{formatDayLabel(d.date)}</span>
              </button>
            ))}
          </div>

          <div className="flex-none px-4 pb-[10px]">
            <span className="inline-flex items-center gap-[6px] rounded-full bg-warn-soft px-[11px] py-[5px] text-[12.5px] font-bold text-[#b9762a]">
              <Icon name="cloudoff" size={13} /> 離線模式：地圖需要網路，以下為已快取行程
            </span>
          </div>
        </>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 [scrollbar-width:none]">
        {!hasCache ? (
          <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <div className="ph mb-1 flex h-[110px] w-[150px] items-center justify-center rounded-xl">
              <span className="ph-label">離線</span>
            </div>
            <p className="max-w-[250px] text-sm leading-[1.55] text-ink-2">
              離線且尚無快取行程。請先連線開啟一次這趟旅程，行程就會自動存到本機供離線檢視。
            </p>
          </div>
        ) : dayItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 pt-12 text-center">
            <div className="ph mb-1 flex h-[110px] w-[150px] items-center justify-center rounded-xl">
              <span className="ph-label">這天還沒有行程</span>
            </div>
            <p className="max-w-[230px] text-sm leading-[1.55] text-ink-2">
              連線時加入的景點與交通會出現在這裡。
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dayItems.map((it, idx) => {
              const next = dayItems[idx + 1]
              const hasCoord = (i: Item) => i.lat != null && i.lng != null
              const showTransit = !!next && hasCoord(it) && hasCoord(next)
              const transport = showTransit
                ? (transportByPair.get(`${it.id}|${next.id}`) ?? null)
                : null
              return (
                <Fragment key={it.id}>
                  {it.type === 'area' ? (
                    <AreaCard
                      item={it}
                      candidates={candidatesByItem.get(it.id) ?? []}
                      selected={false}
                      onSelect={noop}
                      onToggleCandidate={noop}
                    />
                  ) : (
                    <PlaceCard
                      item={it}
                      n={numberOf.get(it.id) ?? 0}
                      selected={false}
                      eff={daySchedule.get(it.id)}
                      onSelect={noop}
                    />
                  )}
                  {showTransit && (
                    <TransitRow
                      transport={transport}
                      latestDeparture={daySchedule.get(it.id)?.latestDeparture ?? null}
                      onClick={noop}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
