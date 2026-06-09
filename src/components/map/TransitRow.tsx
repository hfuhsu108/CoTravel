import type { Transport } from '../../lib/types'
import Icon from '../Icon'
import { modeIcon, transportLabel } from './transitMeta'

interface TransitRowProps {
  transport: Transport | null // null = 尚未設定這段交通
  onClick: () => void
}

// 相鄰兩項目間的交通列（畫面 2，對照設計稿 TransitRow）。
// 左側虛線豎條銜接上下卡；已設定顯示模式＋時間，未設定顯示淡色「加交通」。
export default function TransitRow({ transport, onClick }: TransitRowProps) {
  const configured = transport !== null
  const time = transport?.duration_min != null ? `${transport.duration_min} 分` : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative ml-[19px] flex w-[calc(100%-19px)] items-center gap-[9px] whitespace-nowrap bg-transparent px-3 py-[7px] text-left"
    >
      {/* 虛線豎條（銜接上下卡） */}
      <span
        className="absolute -bottom-[6px] -top-[6px] left-[-19px] w-[2px]"
        style={{
          backgroundImage: 'linear-gradient(var(--line-strong) 60%, transparent 0)',
          backgroundSize: '2px 8px',
        }}
      />
      {configured ? (
        <>
          <span className="flex text-ink-2">
            <Icon name={modeIcon(transport.mode)} size={18} />
          </span>
          <span className="text-[13px] font-semibold text-ink-2">{transportLabel(transport)}</span>
          {time && <span className="num text-[13px] font-bold text-ink-2">· {time}</span>}
          {transport.cost_text && (
            <span className="num text-[12.5px] font-bold text-ink-3">· {transport.cost_text}</span>
          )}
        </>
      ) : (
        <>
          <span className="flex text-ink-3">
            <Icon name="plus" size={16} />
          </span>
          <span className="text-[13px] font-semibold text-ink-3">加交通</span>
        </>
      )}
      <span className="flex-1" />
      <span className="flex text-ink-3">
        <Icon name="chevR" size={15} />
      </span>
    </button>
  )
}
