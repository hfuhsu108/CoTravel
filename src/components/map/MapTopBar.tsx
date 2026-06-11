import { useNavigate } from 'react-router-dom'
import Icon from '../Icon'
import Avatar from '../Avatar'
import type { TripMemberWithProfile } from '../../lib/types'

interface MapTopBarProps {
  tripName: string
  dateRange: string | null
  members: TripMemberWithProfile[]
  meId: string
  // 通知（階段 6）：有未讀對方改動時顯示紅點；點鈴鐺開最近改動清單
  unread?: boolean
  onBell?: () => void
}

// 主畫面浮層頂列：返回旅程列表、置中旅程名＋日期、兩人頭像對、鈴鐺。
export default function MapTopBar({
  tripName,
  dateRange,
  members,
  meId,
  unread = false,
  onBell,
}: MapTopBarProps) {
  const navigate = useNavigate()
  const me = members.find((m) => m.user_id === meId)
  const partner = members.find((m) => m.user_id !== meId)

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <div className="pointer-events-auto flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/trips')}
          aria-label="返回旅程列表"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] border border-line bg-surface text-ink-2 shadow-1 active:scale-95"
        >
          <Icon name="back" size={20} />
        </button>

        <div className="min-w-0 flex-1 text-center leading-[1.1]">
          <div className="truncate text-base font-bold">{tripName}</div>
          {dateRange && <div className="num text-[11.5px] font-bold text-ink-3">{dateRange}</div>}
        </div>

        <div className="flex flex-none items-center gap-[6px]">
          <div className="flex">
            <Avatar
              name={me?.profile?.display_name}
              avatarUrl={me?.profile?.avatar_url}
              size={32}
              ring
            />
            {partner && (
              <Avatar
                name={partner.profile?.display_name}
                avatarUrl={partner.profile?.avatar_url}
                partner
                size={32}
                ring
                className="-ml-[9px]"
              />
            )}
          </div>
          <button
            type="button"
            aria-label="通知"
            onClick={onBell}
            className="relative flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-surface text-ink-2 shadow-1 active:scale-95"
          >
            <Icon name="bell" size={19} />
            {unread && (
              <span className="absolute right-2 top-[7px] h-[9px] w-[9px] rounded-full border-2 border-white bg-danger" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
