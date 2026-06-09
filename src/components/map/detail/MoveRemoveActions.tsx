import { useState } from 'react'
import type { Day } from '../../../lib/types'
import Icon from '../../Icon'

interface MoveRemoveActionsProps {
  itemName: string
  days: Day[]
  currentDayId: string | null
  onMoveDay: (dayId: string) => Promise<void>
  onRemove: () => Promise<void>
}

// 「移到其他天」（展開日選）＋「移除」（確認），PlaceDetail / AreaDetail 共用。
export default function MoveRemoveActions({
  itemName,
  days,
  currentDayId,
  onMoveDay,
  onRemove,
}: MoveRemoveActionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const otherDays = days.filter((d) => d.id !== currentDayId)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex gap-[10px]">
        <button
          type="button"
          disabled={busy || otherDays.length === 0}
          onClick={() => setPickerOpen((o) => !o)}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[14px] text-base font-bold text-primary-deep active:scale-[0.98] disabled:opacity-50"
        >
          <Icon name="move" size={16} /> 移到其他天
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`確定要移除「${itemName}」嗎？`)) void run(onRemove)
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-md py-[14px] text-base font-bold text-danger active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'var(--pink-soft)' }}
        >
          <Icon name="trash" size={16} /> 移除
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3">
          <div className="mb-2 text-[13px] font-bold text-ink-2">移到哪一天？</div>
          {otherDays.length === 0 ? (
            <div className="text-[13px] text-ink-3">沒有其他天可移動</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {otherDays.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => onMoveDay(d.id))}
                  className="num rounded-full bg-white px-3 py-[6px] text-[13px] font-bold text-primary-deep shadow-1 active:scale-95 disabled:opacity-50"
                >
                  Day {d.day_index}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
