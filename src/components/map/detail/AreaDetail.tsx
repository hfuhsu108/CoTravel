import { useState } from 'react'
import type { AreaCandidate, Day, Item } from '../../../lib/types'
import type { ItemPatch } from '../../../lib/itinerary'
import Icon from '../../Icon'
import { DetailHead, Eyebrow } from './parts'
import MoveRemoveActions from './MoveRemoveActions'

interface AreaDetailProps {
  item: Item
  candidates: AreaCandidate[]
  days: Day[]
  onUpdate: (patch: ItemPatch) => Promise<void>
  onRemove: () => Promise<void>
  onMoveDay: (dayId: string) => Promise<void>
  onToggleCandidate: (c: AreaCandidate) => Promise<void>
  onRemoveCandidate: (id: string) => Promise<void>
  onAddCandidate: () => void
}

export default function AreaDetail({
  item,
  candidates,
  days,
  onUpdate,
  onRemove,
  onMoveDay,
  onToggleCandidate,
  onRemoveCandidate,
  onAddCandidate,
}: AreaDetailProps) {
  const [notes, setNotes] = useState(item.notes ?? '')

  return (
    <>
      <DetailHead
        title={item.name}
        badge={
          <span className="inline-flex items-center gap-[6px] rounded-full bg-primary-soft px-[11px] py-[5px] text-[12.5px] font-bold text-primary-deep">
            <Icon name="layers" size={13} /> 區域{item.time_slot ? ` · ${item.time_slot}` : ''}
          </span>
        }
      />

      {/* 範圍縮圖（虛線圓示意） */}
      <div className="relative mb-[18px] flex h-[120px] items-center justify-center overflow-hidden rounded-lg bg-map-bg shadow-1">
        <div
          className="h-[90px] w-[90px] rounded-full"
          style={{ border: '2.5px dashed var(--primary)', background: 'rgba(122,108,240,.12)' }}
        />
        <span className="absolute bottom-2 right-2 num rounded-full bg-white/80 px-2 py-[2px] text-[11px] font-bold text-ink-3">
          半徑 {item.radius_m ?? 300} m
        </span>
      </div>

      <div className="mb-[10px] flex items-center justify-between">
        <Eyebrow>候選店家（{candidates.length}）</Eyebrow>
        <span className="text-[12.5px] font-bold text-ink-3">勾選＝今天就去這間</span>
      </div>

      <div className="flex flex-col gap-[9px]">
        {candidates.length === 0 && (
          <div className="rounded-lg border border-line bg-surface-2 py-5 text-center text-[13px] text-ink-3">
            還沒有候選店家
          </div>
        )}
        {candidates.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-[11px] rounded-lg bg-surface p-[10px] shadow-1"
          >
            <button
              type="button"
              onClick={() => void onToggleCandidate(c)}
              aria-label={c.chosen ? '取消選定' : '選定今天就去'}
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] border-2 transition-colors"
              style={{
                background: c.chosen ? 'var(--primary)' : 'var(--surface)',
                borderColor: c.chosen ? 'var(--primary)' : 'var(--line-strong)',
                color: '#fff',
              }}
            >
              {c.chosen && <Icon name="check" size={15} />}
            </button>
            <span className={`flex-1 text-[14.5px] ${c.chosen ? 'font-bold' : 'font-medium'}`}>
              {c.name}
            </span>
            <button
              type="button"
              onClick={() => void onRemoveCandidate(c.id)}
              aria-label="移除候選"
              className="flex h-7 w-7 items-center justify-center text-ink-3 active:scale-90"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAddCandidate}
        className="mt-[14px] flex w-full items-center justify-center gap-2 rounded-md bg-primary-soft py-[14px] font-bold text-primary-deep active:scale-[0.99]"
        style={{ border: '1.5px dashed var(--primary)' }}
      >
        <Icon name="plus" size={17} /> 新增候選店家
      </button>

      <div className="my-4">
        <Eyebrow>備註</Eyebrow>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const next = notes.trim() || null
            if (next !== (item.notes ?? null)) void onUpdate({ notes: next })
          }}
          placeholder="例如：逛街＋找午餐，看哪間人少就進"
          rows={2}
          className="mt-2 w-full resize-none rounded-lg border border-line bg-surface-2 px-[15px] py-[13px] text-[14.5px] leading-[1.55] text-ink-2 outline-none focus:border-primary focus:bg-white"
        />
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
