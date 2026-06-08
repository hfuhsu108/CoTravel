import Avatar from './Avatar'
import MiniMapBg from './MiniMapBg'
import { getTripBadge, getTripStatus, formatDateRange } from '../lib/tripStatus'
import type { TripWithMembers } from '../lib/types'

// 真實旅程沒有封面圖（階段 1 未做上傳），故依 id 穩定挑一種佔位封面樣式。
type Cover = 'warm' | 'cool' | 'map'
function coverVariant(id: string): Cover {
  let h = 0
  for (const ch of id) h = (h + ch.charCodeAt(0)) % 3
  return (['warm', 'cool', 'map'] as const)[h]
}

interface TripCardProps {
  trip: TripWithMembers
  meId: string
  big?: boolean
  onOpen: (trip: TripWithMembers) => void
}

export default function TripCard({ trip, meId, big = false, onOpen }: TripCardProps) {
  const status = getTripStatus(trip)
  const live = status === 'ongoing'
  const badge = getTripBadge(trip)
  const range = formatDateRange(trip.start_date, trip.end_date)
  const cover = coverVariant(trip.id)
  const coverLabel = trip.destination || trip.name

  // 我排前面（左、主色），夥伴在後（右、粉色）
  const members = [...trip.members]
    .sort((a, b) => (a.user_id === meId ? -1 : b.user_id === meId ? 1 : 0))
    .slice(0, 2)

  return (
    <button
      type="button"
      onClick={() => onOpen(trip)}
      className="block w-full animate-fadeup overflow-hidden rounded-lg text-left"
      style={{
        boxShadow: live ? '0 14px 32px rgba(122,108,240,0.22)' : 'var(--sh-2)',
        outline: live ? '2px solid var(--primary)' : undefined,
      }}
    >
      <div
        className={`ph ${cover === 'warm' ? 'ph-warm' : cover === 'cool' ? 'ph-cool' : ''} relative flex items-end`}
        style={{ height: big ? 138 : 104 }}
      >
        {cover === 'map' && <MiniMapBg />}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(20,12,40,0.5))' }}
        />
        <span className="ph-label absolute left-3 top-[10px] z-[2]">{coverLabel}</span>
        <div className="absolute right-[10px] top-[10px] z-[3]">
          {live ? (
            <span
              className="inline-flex items-center gap-[6px] rounded-full px-[11px] py-[5px] text-[12.5px] font-bold"
              style={{ background: '#ffeef0', color: '#d6435f' }}
            >
              <span className="inline-block h-[7px] w-[7px] rounded-full bg-current" />
              {badge}
            </span>
          ) : (
            <span
              className="inline-flex items-center rounded-full px-[11px] py-[5px] text-[12.5px] font-bold"
              style={
                status === 'upcoming'
                  ? { background: 'rgba(255,255,255,0.92)', color: 'var(--primary-deep)' }
                  : { background: 'rgba(255,255,255,0.85)', color: 'var(--ink-2)' }
              }
            >
              {badge}
            </span>
          )}
        </div>
        <div className="relative z-[2] flex w-full items-end justify-between px-[14px] pb-3 text-white">
          <div>
            <div
              className="font-bold"
              style={{ fontSize: big ? 22 : 18, textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}
            >
              {trip.name}
            </div>
            <div
              className="num mt-[2px] font-semibold"
              style={{ fontSize: 13, opacity: 0.95, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
            >
              {range}
            </div>
          </div>
          <div className="flex">
            {members.map((m, i) => (
              <Avatar
                key={m.user_id}
                name={m.profile?.display_name}
                avatarUrl={m.profile?.avatar_url}
                partner={m.user_id !== meId}
                size={28}
                ring
                className={i > 0 ? '-ml-[9px]' : ''}
              />
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}
