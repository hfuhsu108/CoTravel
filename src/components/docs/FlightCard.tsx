import { useState } from 'react'
import type { Document } from '../../lib/types'
import type { FlightView } from '../../lib/transports'
import { isDateOutsideTrip } from '../../lib/scheduleWarnings'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import FlightSchedule from './FlightSchedule'

interface FlightCardProps {
  flight: FlightView
  ticket: Document | null // 連結的機票檔（可選）
  tripStart: string | null // 旅程起訖（日期防呆）
  tripEnd: string | null
  onEdit: () => void
  onDelete: () => Promise<void>
  onViewTicket: () => void
}

// 航班摘要卡（功能 5）：航班編號、起訖機場與當地時間+時區、飛行時數、時差、機票檔、編輯/刪除。
// 時刻呈現抽到 FlightSchedule（與行程的航班段共用）。
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

      <FlightSchedule
        transport={t}
        fromName={fromItem?.name ?? '出發'}
        toName={toItem?.name ?? '抵達'}
      />

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
