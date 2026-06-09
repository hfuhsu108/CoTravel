import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { AreaCandidate, Day, Item } from '../../lib/types'
import { formatDayLabel } from '../../lib/date'
import Icon from '../Icon'
import PlaceCard from './cards/PlaceCard'
import AreaCard from './cards/AreaCard'
import SortableCard from './SortableCard'

interface DaySidebarProps {
  day: Day | null
  items: Item[] // 當天 scheduled，已依 order_index 排序
  candidatesByItem: Map<string, AreaCandidate[]>
  selectedItemId: string | null
  showRoute: boolean
  onToggleRoute: () => void
  onCollapse: () => void
  onSelectItem: (item: Item) => void
  onToggleCandidate: (candidate: AreaCandidate) => void
  onAddItem?: () => void
}

// 當日行程側欄（畫面 2）：底部升起的圓角面板，列出定點/區域卡（混排），底部「＋ 加項目」。
// 拖拉排序於 Phase F 加上；此處先是靜態清單骨架。
export default function DaySidebar({
  day,
  items,
  candidatesByItem,
  selectedItemId,
  showRoute,
  onToggleRoute,
  onCollapse,
  onSelectItem,
  onToggleCandidate,
  onAddItem,
}: DaySidebarProps) {
  // 編號只算定點（依 order_index）；區域不給編號
  const points = items.filter((i) => i.type === 'point')
  const numberOf = new Map(points.map((p, i) => [p.id, i + 1]))

  return (
    <div
      className="absolute inset-x-0 bottom-0 top-[150px] z-20 flex flex-col rounded-t-[26px] bg-bg animate-slideup"
      style={{ boxShadow: '0 -10px 40px rgba(40,28,90,.2)' }}
    >
      <div className="mx-auto mb-1 mt-[6px] h-[5px] w-[42px] flex-none rounded-full bg-line-strong" />

      <div className="flex items-center justify-between px-[18px] pb-3 pt-1">
        <div>
          <div className="text-[17px] font-extrabold">
            {day ? `${formatDayLabel(day.date)}・Day ${day.day_index}` : '行程'}
          </div>
          <div className="text-[12.5px] font-semibold text-ink-3">
            {items.length > 0 ? `${points.length} 個地點` : '尚無安排'}
          </div>
        </div>
        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            onClick={onToggleRoute}
            title="路線"
            aria-pressed={showRoute}
            className="flex h-10 w-10 items-center justify-center rounded-[13px] border active:scale-95"
            style={{
              color: showRoute ? 'var(--primary-deep)' : 'var(--ink-3)',
              background: showRoute ? 'var(--primary-soft)' : 'transparent',
              borderColor: showRoute ? 'var(--primary-soft)' : 'var(--line)',
            }}
          >
            <Icon name="nav" size={18} />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            title="收合"
            className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-surface text-ink-2 shadow-1 active:scale-95"
          >
            <Icon name="chevD" size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 [scrollbar-width:none]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 pt-12 text-center">
            <div className="ph mb-1 flex h-[110px] w-[150px] items-center justify-center rounded-xl">
              <span className="ph-label">這天還沒有行程</span>
            </div>
            <p className="max-w-[230px] text-sm leading-[1.55] text-ink-2">
              用下方搜尋加入景點，或圈一個區域放候選店家。
            </p>
          </div>
        ) : (
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <SortableCard key={it.id} id={it.id}>
                  {it.type === 'area' ? (
                    <AreaCard
                      item={it}
                      candidates={candidatesByItem.get(it.id) ?? []}
                      selected={selectedItemId === it.id}
                      onSelect={() => onSelectItem(it)}
                      onToggleCandidate={onToggleCandidate}
                    />
                  ) : (
                    <PlaceCard
                      item={it}
                      n={numberOf.get(it.id) ?? 0}
                      selected={selectedItemId === it.id}
                      onSelect={() => onSelectItem(it)}
                    />
                  )}
                </SortableCard>
              ))}
            </div>
          </SortableContext>
        )}

        {onAddItem && (
          <button
            type="button"
            onClick={onAddItem}
            className="mt-[14px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary-soft py-[15px] font-bold text-primary-deep active:scale-[0.99]"
            style={{ border: '1.5px dashed var(--primary)' }}
          >
            <Icon name="plus" size={18} /> 加項目
          </button>
        )}
      </div>
    </div>
  )
}
