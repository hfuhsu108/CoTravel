import { useEffect, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Day, Document, Item } from '../../../lib/types'
import { displayName, type ItemPatch } from '../../../lib/itinerary'
import { kkdaySearchUrl, klookSearchUrl, openExternal } from '../../../lib/deeplinks'
import { formatDurationZh, tzForCoords, tzOffsetLabel, tzLabel } from '../../../lib/time'
import { formatMin, parseHHMM, type EffTime } from '../../../lib/schedule'
import Icon from '../../Icon'
import Time24Field from '../../ui/Time24Field'
import LinkedDocs from '../../docs/LinkedDocs'
import ReminderSection from '../../ReminderSection'
import { DetailHead, InfoRow, Eyebrow } from './parts'
import MoveRemoveActions from './MoveRemoveActions'
import TagEditor from './TagEditor'

interface PlaceDetailProps {
  item: Item
  stationLabel: string | null // 例：'Day 2・第 2 站'
  days: Day[]
  tripTz: string | null // 旅程主時區（功能 5）
  effTime: EffTime | null // 有效三時間（功能 4；含推算值）
  warnings: string[] // 時間防呆警告（功能 8）
  linkedDocs: Document[]
  meId: string
  onManageDocs: () => void
  onUpdate: (patch: ItemPatch) => Promise<void>
  onRemove: () => Promise<void>
  onDuplicate: () => Promise<void>
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

// 造訪時間是否落在營業時間外（功能 8；best-effort 解析 Google 中文營業字串，無法解析則不警告）
function hoursOutsideWarning(hoursToday: string | null, arrivalMin: number | null): string | null {
  if (!hoursToday || arrivalMin == null) return null
  if (/休|closed/i.test(hoursToday)) return '造訪日當天可能公休'
  if (/24\s*小時|24 hours/i.test(hoursToday)) return null
  const nums = hoursToday.match(/\d{1,2}:\d{2}/g)
  if (!nums || nums.length < 2) return null
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const o = parseHHMM(nums[i])
    let c = parseHHMM(nums[i + 1])
    if (o == null || c == null) continue
    if (c < o) c += 1440 // 跨夜營業
    let a = ((arrivalMin % 1440) + 1440) % 1440
    if (a < o) a += 1440
    if (a >= o && a <= c) return null
  }
  return '造訪時間可能在營業時間外'
}

export default function PlaceDetail({
  item,
  stationLabel,
  days,
  tripTz,
  effTime,
  warnings,
  linkedDocs,
  meId,
  onManageDocs,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveDay,
}: PlaceDetailProps) {
  const places = useMapsLibrary('places')

  // 功能 5：地點時區（存的優先，否則由座標推）。與旅程主時區不同 → 造訪時間旁標時區，避免跨國誤判。
  const itemTz = item.timezone ?? tzForCoords(item.lat, item.lng)
  const itemDate = days.find((d) => d.id === item.day_id)?.date
  const showTz = !!itemTz && !!tripTz && itemTz !== tripTz

  const [live, setLive] = useState<LiveDetails | null>(null)
  const [time, setTime] = useState(item.scheduled_time?.slice(0, 5) ?? '') // 抵達
  const [stay, setStay] = useState(item.stay_minutes != null ? String(item.stay_minutes) : '')
  const [departure, setDeparture] = useState(item.departure_time?.slice(0, 5) ?? '')
  const [editingAlias, setEditingAlias] = useState(false) // 標題鉛筆行內編輯
  const [aliasDraft, setAliasDraft] = useState('')
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

  // 別名行內編輯（功能 2）：存檔時若等於原名或空白 → alias=null（標題回原名）
  function saveAlias() {
    const next = aliasDraft.trim()
    const finalAlias = !next || next === item.name ? null : next
    if (finalAlias !== (item.alias ?? null)) void saveIfChanged({ alias: finalAlias })
    setEditingAlias(false)
  }

  function handleNavigate() {
    if (item.lat == null || item.lng == null) return
    const base = 'https://www.google.com/maps/search/?api=1'
    const q = `&query=${item.lat},${item.lng}`
    const pid = item.google_place_id ? `&query_place_id=${item.google_place_id}` : ''
    window.open(`${base}${q}${pid}`, '_blank', 'noopener,noreferrer')
  }

  const timeInputClass =
    'num rounded-md border border-line-strong bg-surface-2 px-2 py-[6px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white'

  // 營業時間外警告（依有效抵達）；併入站間/同站警告一起顯示
  const arrivalEff = effTime?.arrival ?? parseHHMM(item.scheduled_time)
  const hoursWarn = hoursOutsideWarning(live?.hoursToday ?? null, arrivalEff)
  const allWarnings = hoursWarn ? [...warnings, hoursWarn] : warnings

  // 系統推算（未手填、但可由相鄰/同站推得的值）提示
  const derivedParts: string[] = []
  if (effTime) {
    if (!time && effTime.arrival != null && !effTime.arrivalManual)
      derivedParts.push(`抵達 ${formatMin(effTime.arrival)}`)
    if (!stay && effTime.stay != null && !effTime.stayManual)
      derivedParts.push(`停留 ${formatDurationZh(effTime.stay)}`)
    if (!departure && effTime.departure != null && !effTime.departureManual)
      derivedParts.push(`離開 ${formatMin(effTime.departure)}`)
  }

  return (
    <>
      <DetailHead
        title={
          editingAlias ? (
            <input
              autoFocus
              value={aliasDraft}
              onChange={(e) => setAliasDraft(e.target.value)}
              onBlur={saveAlias}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveAlias()
                } else if (e.key === 'Escape') {
                  setEditingAlias(false)
                }
              }}
              className="w-full rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[22px] font-bold text-ink outline-none focus:border-primary focus:bg-white"
            />
          ) : (
            <span className="inline-flex items-center gap-2">
              {displayName(item)}
              <button
                type="button"
                aria-label="編輯別名"
                onClick={() => {
                  setAliasDraft(displayName(item))
                  setEditingAlias(true)
                }}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-ink-3 active:scale-90"
              >
                <Icon name="edit" size={16} />
              </button>
            </span>
          )
        }
        badge={
          stationLabel ? (
            <span className="inline-flex items-center rounded-full bg-primary-soft px-[11px] py-[5px] text-[12.5px] font-bold text-primary-deep">
              {stationLabel}
            </span>
          ) : undefined
        }
        sub={
          live?.rating != null || (item.alias && item.alias.trim()) ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {live?.rating != null && (
                <span className="flex items-center gap-[5px]">
                  <span className="flex text-warn">
                    <Icon name="star" size={15} fill />
                  </span>
                  <b className="num text-ink">{live.rating}</b>
                </span>
              )}
              {item.alias && item.alias.trim() && (
                <span className="text-[12.5px] text-ink-3">原名：{item.name}</span>
              )}
            </span>
          ) : undefined
        }
      />

      <InfoRow icon="pin" label="地址" value={live?.address ?? '—'} />
      <InfoRow icon="clock" label="營業" value={live?.hoursToday ?? '—'} />

      <div className="my-4">
        <Eyebrow>時間</Eyebrow>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-ink-3">抵達</span>
            <Time24Field
              value={time}
              disabled={busy}
              onChange={setTime}
              onCommit={(v) => {
                const next = v || null
                if (next !== (item.scheduled_time?.slice(0, 5) ?? null))
                  void saveIfChanged({ scheduled_time: next })
              }}
              className={`${timeInputClass} w-[84px] text-center`}
              ariaLabel="抵達時間"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-ink-3">停留（分）</span>
            <input
              inputMode="numeric"
              value={stay}
              disabled={busy}
              placeholder="—"
              onChange={(e) => setStay(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => {
                const n = stay.trim() ? Number.parseInt(stay, 10) : null
                const next = n != null && Number.isFinite(n) ? n : null
                if (next !== (item.stay_minutes ?? null)) void saveIfChanged({ stay_minutes: next })
              }}
              className={`${timeInputClass} w-[76px]`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-ink-3">離開</span>
            <Time24Field
              value={departure}
              disabled={busy}
              onChange={setDeparture}
              onCommit={(v) => {
                const next = v || null
                if (next !== (item.departure_time?.slice(0, 5) ?? null))
                  void saveIfChanged({ departure_time: next })
              }}
              className={`${timeInputClass} w-[84px] text-center`}
              ariaLabel="離開時間"
            />
          </label>
          {showTz && itemTz && (
            <span
              title={tzLabel(itemTz, itemDate)}
              className="mb-1 rounded-full bg-warn-soft px-[9px] py-[3px] text-[11px] font-bold text-[#b9762a]"
            >
              {tzOffsetLabel(itemTz, itemDate)}
            </span>
          )}
        </div>

        {derivedParts.length > 0 && (
          <p className="mt-2 text-[12px] text-ink-3">
            系統推算：{derivedParts.join('、')}（填了會以你填的為準）
          </p>
        )}

        {allWarnings.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {allWarnings.map((w) => (
              <p
                key={w}
                className="flex items-start gap-[6px] text-[12.5px] font-semibold text-[#b9762a]"
              >
                <Icon name="clock" size={13} className="mt-[1px] flex-none" /> {w}
              </p>
            ))}
          </div>
        )}
      </div>

      <ReminderSection
        targetType="item"
        targetId={item.id}
        targetName={displayName(item)}
        baseTime={item.scheduled_time?.slice(0, 5) ?? null}
        baseTz={itemTz}
        baseDate={itemDate ?? null}
        meId={meId}
      />

      <div className="my-4">
        <Eyebrow>清單</Eyebrow>
        <div className="mt-2">
          <TagEditor tags={item.tags} busy={busy} onChange={(tags) => void saveIfChanged({ tags })} />
        </div>
      </div>

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

      <button
        type="button"
        disabled={busy}
        onClick={() => void onDuplicate()}
        className="mb-[10px] flex w-full items-center justify-center gap-2 rounded-md bg-primary-soft py-[13px] text-[15px] font-bold text-primary-deep active:scale-[0.98] disabled:opacity-60"
      >
        <Icon name="plus" size={17} /> 複製景點
      </button>

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

      {/* 訂票・活動 deep link（功能 13）：以地點名搜尋，跳轉外部平台（無下單 API） */}
      <div className="mb-[14px]">
        <Eyebrow>訂票・活動</Eyebrow>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => openExternal(kkdaySearchUrl(displayName(item)))}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[12px] text-[14px] font-bold text-primary-deep active:scale-[0.98]"
          >
            <Icon name="ticket" size={16} /> KKday
          </button>
          <button
            type="button"
            onClick={() => openExternal(klookSearchUrl(displayName(item)))}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[12px] text-[14px] font-bold text-primary-deep active:scale-[0.98]"
          >
            <Icon name="ticket" size={16} /> Klook
          </button>
        </div>
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
