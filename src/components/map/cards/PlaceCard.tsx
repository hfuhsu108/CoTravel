import type { Item } from '../../../lib/types'
import Icon from '../../Icon'

interface PlaceCardProps {
  item: Item
  n: number // 站序（當天定點編號）
  selected: boolean
  onSelect: () => void
}

// 定點卡（畫面 2 PlaceCard）：縮圖＋編號徽章、名稱、造訪時間 chip、分類 chip。
// 對照 design_handoff/screens-main.jsx 的 PlaceCard 重建（rating 無對應資料欄，先不顯示）。
export default function PlaceCard({ item, n, selected, onSelect }: PlaceCardProps) {
  const time = item.scheduled_time?.slice(0, 5)
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
            alt={item.name}
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
        <div className="truncate text-[15.5px] font-extrabold">{item.name}</div>
        <div className="mt-[3px] flex items-center gap-2">
          {time && (
            <span className="num flex items-center gap-1 rounded-full bg-primary-soft px-2 py-[2px] text-xs font-bold text-primary-deep">
              <Icon name="clock" size={12} />
              {time}
            </span>
          )}
          {item.category && (
            <span className="rounded-full bg-line px-2 py-[2px] text-[11px] font-bold text-ink-2">
              {item.category}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
