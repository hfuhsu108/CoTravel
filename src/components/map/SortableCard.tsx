import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 可排序卡片外殼：拖整張卡，靠 TouchSensor 的 delay（長按）與點擊開詳情、列表捲動共存。
export default function SortableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        // 長按拖曳模式下平時不可設 touch-action:none，否則手機無法垂直捲動列表；
        // 僅在拖曳進行中鎖住，避免捲動搶事件（啟動前由 TouchSensor delay 把關）。
        touchAction: isDragging ? 'none' : undefined,
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}
