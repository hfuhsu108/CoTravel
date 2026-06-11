import { useEffect } from 'react'
import { useTripRealtime } from '../lib/tripRealtime'
import Avatar from './Avatar'
import Icon from './Icon'

// 對方改動的深色通知橫幅（對應 prototype .banner）。掛在 TripMain 層，三個分頁共用。
// top 110px：恰好落在三個分頁的頂列/日分頁/分類頁籤之下。
export default function ActivityBanner() {
  const { latest, members, dismissBanner } = useTripRealtime()

  // 4 秒自動消失；新事件進來重計時
  useEffect(() => {
    if (!latest) return
    const timer = setTimeout(dismissBanner, 4000)
    return () => clearTimeout(timer)
  }, [latest, dismissBanner])

  if (!latest) return null
  const actor = members.find((m) => m.user_id === latest.user_id)
  const name = actor?.profile?.display_name ?? '夥伴'

  return (
    <div
      role="status"
      onClick={dismissBanner}
      className="absolute inset-x-[14px] z-[65] flex cursor-pointer items-center gap-[11px] rounded-2xl bg-[#2b2440] px-[14px] py-3 text-white shadow-3 animate-dropin"
      style={{ top: 'calc(env(safe-area-inset-top) + 110px)' }}
    >
      <Avatar name={name} avatarUrl={actor?.profile?.avatar_url} partner size={30} />
      <div className="flex-1 text-[13px] leading-[1.4]">
        <b>{name}</b> {latest.target_summary}
      </div>
      <span className="flex opacity-70" aria-hidden="true">
        <Icon name="x" size={16} />
      </span>
    </div>
  )
}
