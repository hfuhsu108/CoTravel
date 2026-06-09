import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 可排序卡片外殼：拖整張卡，靠 DndContext 的 activationConstraint(distance) 與點擊開詳情共存。
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
        touchAction: 'none', // 觸控裝置避免拖拉時頁面捲動搶事件
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}
