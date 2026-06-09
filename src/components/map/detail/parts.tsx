import type { ReactNode } from 'react'
import Icon, { type IconName } from '../../Icon'

// 詳情頁共用零件（對照 design_handoff/screens-main.jsx 的 DetailHead / InfoRow）。

export function DetailHead({
  title,
  sub,
  badge,
}: {
  title: ReactNode
  sub?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="mb-[14px]">
      {badge}
      <h1 className="mt-[6px] text-[25px] font-bold tracking-[-0.02em]">{title}</h1>
      {sub && <div className="mt-[5px] text-sm text-ink-2">{sub}</div>}
    </div>
  )
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3">
      <span className="flex text-ink-3">
        <Icon name={icon} size={19} />
      </span>
      <span className="w-[62px] text-[13.5px] font-bold text-ink-3">{label}</span>
      <span className="flex-1 text-[14.5px] font-semibold">{value}</span>
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-round text-xs font-bold uppercase tracking-[0.14em] text-ink-3">
      {children}
    </div>
  )
}
