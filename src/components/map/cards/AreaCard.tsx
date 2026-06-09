import { useState } from 'react'
import type { AreaCandidate, Item } from '../../../lib/types'
import Icon from '../../Icon'

interface AreaCardProps {
  item: Item
  candidates: AreaCandidate[]
  selected: boolean
  onSelect: () => void
  onToggleCandidate: (candidate: AreaCandidate) => void
}

// 區域卡（畫面 2 AreaCard）：虛線圓圖示、區域名、時段 chip、候選數；可就地展開勾選候選。
export default function AreaCard({
  item,
  candidates,
  selected,
  onSelect,
  onToggleCandidate,
}: AreaCardProps) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="overflow-hidden rounded-lg bg-surface"
      style={{ boxShadow: selected ? '0 0 0 2px var(--primary), var(--sh-2)' : 'var(--sh-1)' }}
    >
      <div onClick={onSelect} className="flex cursor-pointer items-center gap-[11px] p-[10px]">
        <div
          className="flex h-[58px] w-[58px] flex-none items-center justify-center rounded-full text-primary-deep"
          style={{ background: 'rgba(122,108,240,.14)', border: '2px dashed var(--primary)' }}
        >
          <Icon name="layers" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px] font-extrabold">{item.name}</div>
          <div className="mt-1 flex items-center gap-[7px]">
            {item.time_slot && (
              <span className="rounded-full bg-primary-soft px-[9px] py-[2px] text-xs font-bold text-primary-deep">
                {item.time_slot}
              </span>
            )}
            <span className="text-[12.5px] font-bold text-ink-3">{candidates.length} 個候選</span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          aria-label={open ? '收合候選' : '展開候選'}
          className="flex h-7 w-7 items-center justify-center text-ink-2"
        >
          <span
            className="flex transition-transform"
            style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)' }}
          >
            <Icon name="chevD" size={18} />
          </span>
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3">
          {candidates.length === 0 && (
            <div className="border-t border-line py-3 text-center text-[13px] text-ink-3">
              還沒有候選店家
            </div>
          )}
          {candidates.map((c) => (
            <div key={c.id} className="flex items-center gap-[9px] border-t border-line py-2">
              <button
                type="button"
                onClick={() => onToggleCandidate(c)}
                aria-label={c.chosen ? '取消選定' : '選定今天就去'}
                className="flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-2 transition-colors"
                style={{
                  background: c.chosen ? 'var(--primary)' : 'var(--surface)',
                  borderColor: c.chosen ? 'var(--primary)' : 'var(--line-strong)',
                  color: '#fff',
                }}
              >
                {c.chosen && <Icon name="check" size={13} />}
              </button>
              <span className={`flex-1 text-sm ${c.chosen ? 'font-bold' : 'font-medium'}`}>
                {c.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
