import Icon, { type IconName } from './Icon'

// 旅程分組標題：圖示 + 標題 + 數量 chip（過往組可摺疊）。對應 prototype 的 GroupHeader。
interface GroupHeaderProps {
  icon: IconName
  title: string
  count: number
  color: string
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
}

export default function GroupHeader({
  icon,
  title,
  count,
  color,
  collapsible = false,
  open = false,
  onToggle,
}: GroupHeaderProps) {
  return (
    <div className="mx-1 mb-3 mt-[22px] flex items-center justify-between">
      <div className="flex items-center gap-[9px]">
        <span className="flex" style={{ color }}>
          <Icon name={icon} size={19} fill={icon === 'pin'} />
        </span>
        <h3 className="text-base font-bold">{title}</h3>
        <span className="rounded-full bg-line px-[9px] py-[2px] text-xs font-bold text-ink-2">{count}</span>
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center text-ink-2"
          aria-label={open ? '收合' : '展開'}
        >
          <span
            className="flex transition-transform duration-200"
            style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)' }}
          >
            <Icon name="chevD" size={18} />
          </span>
        </button>
      )}
    </div>
  )
}
