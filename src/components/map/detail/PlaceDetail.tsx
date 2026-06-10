import { useEffect, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Day, Document, Item } from '../../../lib/types'
import type { ItemPatch } from '../../../lib/itinerary'
import Icon from '../../Icon'
import LinkedDocs from '../../docs/LinkedDocs'
import { DetailHead, InfoRow, Eyebrow } from './parts'
import MoveRemoveActions from './MoveRemoveActions'

interface PlaceDetailProps {
  item: Item
  stationLabel: string | null // 例：'Day 2・第 2 站'
  days: Day[]
  linkedDocs: Document[]
  onManageDocs: () => void
  onUpdate: (patch: ItemPatch) => Promise<void>
  onRemove: () => Promise<void>
  onMoveDay: (dayId: string) => Promise<void>
}

interface LiveDetails {
  rating: number | null
  address: string | null
  hoursToday: string | null
}

// 週幾營業字串以 Monday 起算，對應 JS getDay()（Sun=0）
function todayHours(descs: string[] | null | undefined): string | null {
  if (!descs || descs.length === 0) return null
  const idx = (new Date().getDay() + 6) % 7
  return descs[idx] ?? null
}

export default function PlaceDetail({
  item,
  stationLabel,
  days,
  linkedDocs,
  onManageDocs,
  onUpdate,
  onRemove,
  onMoveDay,
}: PlaceDetailProps) {
  const places = useMapsLibrary('places')

  const [live, setLive] = useState<LiveDetails | null>(null)
  const [time, setTime] = useState(item.scheduled_time?.slice(0, 5) ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [busy, setBusy] = useState(false)

  // 即時抓 rating / 地址 / 今日營業（不持久化；抓不到不影響編輯）
  useEffect(() => {
    if (!places || !item.google_place_id) return
    let active = true
    ;(async () => {
      try {
        const place = new places.Place({ id: item.google_place_id as string })
        await place.fetchFields({
          fields: ['rating', 'formattedAddress', 'regularOpeningHours'],
        })
        if (!active) return
        setLive({
          rating: place.rating ?? null,
          address: place.formattedAddress ?? null,
          hoursToday: todayHours(place.regularOpeningHours?.weekdayDescriptions),
        })
      } catch (e) {
        console.warn('[PlaceDetail] 即時地點資訊取得失敗', e)
      }
    })()
    return () => {
      active = false
    }
  }, [places, item.google_place_id])

  async function saveIfChanged(patch: ItemPatch) {
    setBusy(true)
    try {
      await onUpdate(patch)
    } finally {
      setBusy(false)
    }
  }

  function handleNavigate() {
    if (item.lat == null || item.lng == null) return
    const base = 'https://www.google.com/maps/search/?api=1'
    const q = `&query=${item.lat},${item.lng}`
    const pid = item.google_place_id ? `&query_place_id=${item.google_place_id}` : ''
    window.open(`${base}${q}${pid}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <DetailHead
        title={item.name}
        badge={
          stationLabel ? (
            <span className="inline-flex items-center rounded-full bg-primary-soft px-[11px] py-[5px] text-[12.5px] font-bold text-primary-deep">
              {stationLabel}
            </span>
          ) : undefined
        }
        sub={
          live?.rating != null ? (
            <span className="flex items-center gap-[5px]">
              <span className="flex text-warn">
                <Icon name="star" size={15} fill />
              </span>
              <b className="num text-ink">{live.rating}</b>
            </span>
          ) : undefined
        }
      />

      <InfoRow icon="pin" label="地址" value={live?.address ?? '—'} />
      <InfoRow icon="clock" label="營業" value={live?.hoursToday ?? '—'} />
      <InfoRow
        icon="clock"
        label="造訪時間"
        value={
          <input
            type="time"
            value={time}
            disabled={busy}
            onChange={(e) => setTime(e.target.value)}
            onBlur={() => {
              const next = time || null
              if (next !== (item.scheduled_time?.slice(0, 5) ?? null)) {
                void saveIfChanged({ scheduled_time: next })
              }
            }}
            className="num rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
          />
        }
      />

      <div className="my-4">
        <Eyebrow>備註</Eyebrow>
        <textarea
          value={notes}
          disabled={busy}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const next = notes.trim() || null
            if (next !== (item.notes ?? null)) void saveIfChanged({ notes: next })
          }}
          placeholder="想記的事，例如：門票記得帶、早點到避開人潮"
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-line bg-surface-2 px-[15px] py-[13px] text-[14.5px] leading-[1.55] text-ink-2 outline-none focus:border-primary focus:bg-white"
        />
      </div>

      <LinkedDocs docs={linkedDocs} onManage={onManageDocs} />

      <div className="mb-[10px]">
        <button
          type="button"
          onClick={handleNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-[14px] text-base font-bold text-white active:scale-[0.98]"
          style={{ boxShadow: '0 6px 16px rgba(122,108,240,.35)' }}
        >
          <Icon name="nav" size={17} /> 導航
        </button>
      </div>

      <MoveRemoveActions
        itemName={item.name}
        days={days}
        currentDayId={item.day_id}
        onMoveDay={onMoveDay}
        onRemove={onRemove}
      />
    </>
  )
}
