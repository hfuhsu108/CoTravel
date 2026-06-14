import { useState } from 'react'
import type { Document } from '../../lib/types'
import type { FlightView } from '../../lib/transports'
import { formatDurationZh, spanMinutes, tzOffsetLabel, tzOffsetDiffLabel } from '../../lib/time'
import { isDateOutsideTrip } from '../../lib/scheduleWarnings'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'

interface FlightCardProps {
  flight: FlightView
  ticket: Document | null // 連結的機票檔（可選）
  tripStart: string | null // 旅程起訖（日期防呆）
  tripEnd: string | null
  onEdit: () => void
  onDelete: () => Promise<void>
  onViewTicket: () => void
}

// 'YYYY-MM-DDTHH:MM[:SS]' → 'M/D HH:MM'
function fmtLocal(s: string | null): string {
  if (!s) return '—'
  const date = s.slice(0, 10).split('-')
  const time = s.slice(11, 16)
  if (date.length < 3) return time || '—'
  return `${Number(date[1])}/${Number(date[2])} ${time}`
}

// 航班摘要卡（功能 5）：航班編號、起訖機場與當地時間+時區、飛行時數、時差、機票檔、編輯/刪除。
export default function FlightCard({
  flight,
  ticket,
  tripStart,
  tripEnd,
  onEdit,
  onDelete,
  onViewTicket,
}: FlightCardProps) {
  const { transport: t, fromItem, toItem } = flight
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dateOutside =
    isDateOutsideTrip(t.depart_local?.slice(0, 10) ?? null, tripStart, tripEnd) ||
    isDateOutsideTrip(t.arrive_local?.slice(0, 10) ?? null, tripStart, tripEnd)

  const durationMin =
    t.duration_min ??
    (t.depart_local && t.depart_tz && t.arrive_local && t.arrive_tz
      ? spanMinutes(t.depart_local, t.depart_tz, t.arrive_local, t.arrive_tz)
      : null)
  const diff =
    t.depart_tz && t.arrive_tz
      ? tzOffsetDiffLabel(t.depart_tz, t.arrive_tz, t.depart_local ?? undefined)
      : null

  async function handleDelete() {
    if (!window.confirm(`確定刪除航班${t.flight_no ? ` ${t.flight_no}` : ''}？（起訖機場地點會保留）`)) return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg bg-surface p-4 shadow-1">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-[7px] rounded-full bg-primary-soft px-[11px] py-[5px] text-[13px] font-bold text-primary-deep">
          <Icon name="plane" size={15} />
          <span className="num">{t.flight_no || '航班'}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={onEdit}
            aria-label="編輯航班"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-3 active:scale-90 disabled:opacity-50"
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            aria-label="刪除航班"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-3 active:scale-90 disabled:opacity-50"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>

      {/* 起訖：機場名 + 當地時間 + 時區 */}
      <div className="flex items-stretch gap-2">
        <FlightEnd
          airport={fromItem?.name ?? '出發'}
          terminal={t.depart_terminal}
          local={fmtLocal(t.depart_local)}
          tz={t.depart_tz}
          align="left"
        />
        <div className="flex flex-col items-center justify-center px-1">
          <Icon name="plane" size={18} className="text-primary" />
          {durationMin != null && (
            <span className="num mt-1 whitespace-nowrap text-[11px] font-bold text-ink-3">
              {formatDurationZh(durationMin)}
            </span>
          )}
        </div>
        <FlightEnd
          airport={toItem?.name ?? '抵達'}
          terminal={t.arrive_terminal}
          local={fmtLocal(t.arrive_local)}
          tz={t.arrive_tz}
          align="right"
        />
      </div>

      {diff && (
        <div className="mt-2 text-center text-[12px] font-semibold text-ink-3">
          兩地時差 <span className="num">{diff}</span>
        </div>
      )}

      {dateOutside && (
        <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[12.5px] font-semibold text-[#b9762a]">
          航班日期不在旅程日期範圍內
        </div>
      )}

      {t.notes && (
        <div className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-[1.5] text-ink-2">
          {t.notes}
        </div>
      )}

      {ticket && (
        <button
          type="button"
          onClick={onViewTicket}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary-soft py-[11px] text-[13.5px] font-bold text-primary-deep active:scale-[0.99]"
        >
          <Icon name="ticket" size={16} /> 查看機票
        </button>
      )}

      {error && (
        <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[12.5px] text-[#b9762a]">{error}</div>
      )}
    </div>
  )
}

function FlightEnd({
  airport,
  terminal,
  local,
  tz,
  align,
}: {
  airport: string
  terminal: string | null
  local: string
  tz: string | null
  align: 'left' | 'right'
}) {
  return (
    <div className={`min-w-0 flex-1 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div className="truncate text-[14px] font-extrabold leading-tight">{airport}</div>
      {terminal && <div className="truncate text-[11.5px] font-semibold text-ink-3">{terminal}</div>}
      <div className="num mt-[3px] text-[15px] font-bold text-primary-deep">{local}</div>
      {tz && <div className="num text-[11px] font-semibold text-ink-3">{tzOffsetLabel(tz, undefined)}</div>}
    </div>
  )
}
