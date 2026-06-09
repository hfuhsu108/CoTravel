import { useDroppable } from '@dnd-kit/core'
import type { Day } from '../../lib/types'
import { formatDayLabel } from '../../lib/date'

interface DayTabsProps {
  days: Day[]
  currentDayId: string | null
  dragging: boolean // 是否正在拖拉卡片（拖拉時 tab 變放置目標、顯示提示）
  onSelect: (dayId: string) => void
}

// 橫向 Day 分頁（選中主色實心）。拖拉卡片時每顆成為放置目標 → 放開＝把項目移到該天。
export default function DayTabs({ days, currentDayId, dragging, onSelect }: DayTabsProps) {
  return (
    <div className="flex gap-[7px] overflow-x-auto px-[2px] pb-1 pt-3 [scrollbar-width:none]">
      {days.map((d) => (
        <DayTab
          key={d.id}
          day={d}
          active={d.id === currentDayId}
          dragging={dragging}
          onSelect={() => onSelect(d.id)}
        />
      ))}
    </div>
  )
}

function DayTab({
  day,
  active,
  dragging,
  onSelect,
}: {
  day: Day
  active: boolean
  dragging: boolean
  onSelect: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.id}` })
  const highlight = dragging && isOver
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`flex flex-none flex-col items-center rounded-[13px] px-[13px] py-[7px] text-[13px] font-bold leading-[1.25] shadow-1 backdrop-blur-[4px] transition-all ${
        active ? 'bg-primary text-white' : 'bg-white/90 text-ink-2'
      } ${highlight ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''} ${
        dragging && !active ? 'ring-1 ring-primary/40' : ''
      }`}
    >
      <span className="num">Day {day.day_index}</span>
      <span className="num text-[10.5px] font-semibold opacity-85">{formatDayLabel(day.date)}</span>
    </button>
  )
}
