import { useEffect, useState } from 'react'
import { listActivity } from '../lib/activity'
import { formatRelative } from '../lib/date'
import { errMessage } from '../lib/errMessage'
import type { ActivityEntry, TripMemberWithProfile } from '../lib/types'
import Sheet from './ui/Sheet'
import Avatar from './Avatar'
import Icon from './Icon'

interface NotificationsSheetProps {
  tripId: string
  members: TripMemberWithProfile[]
  meId: string
  onClose: () => void
}

// 鈴鐺點開的「最近改動」清單：activity_log 最近 20 筆（兩人的都列，自己的也算紀錄）
export default function NotificationsSheet({
  tripId,
  members,
  meId,
  onClose,
}: NotificationsSheetProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listActivity(tripId, 20)
      .then((rows) => {
        if (active) setEntries(rows)
      })
      .catch((e) => {
        if (active) setError(errMessage(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tripId])

  return (
    <Sheet onClose={onClose} className="pb-[34px]">
      <div className="flex items-center justify-between px-[22px] pt-[6px]">
        <h2 className="text-xl font-bold">最近改動</h2>
        <button type="button" onClick={onClose} aria-label="關閉" className="text-ink-2">
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="min-h-0 overflow-y-auto px-[22px] pb-2 pt-3">
        {loading ? (
          <div className="py-8 text-center text-[14px] text-ink-3">載入中…</div>
        ) : error ? (
          <div className="py-8 text-center text-[13px] text-danger">{error}</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-ink-3">還沒有任何改動</div>
        ) : (
          entries.map((entry, idx) => {
            const isPartner = entry.user_id !== meId
            const actor = members.find((m) => m.user_id === entry.user_id)
            const name = isPartner ? (actor?.profile?.display_name ?? '夥伴') : '我'
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-[11px] py-[12px] ${
                  idx < entries.length - 1 ? 'border-b border-line' : ''
                }`}
              >
                <Avatar
                  name={actor?.profile?.display_name}
                  avatarUrl={actor?.profile?.avatar_url}
                  partner={isPartner}
                  size={30}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] leading-[1.45]">
                    <b>{name}</b> {entry.target_summary}
                  </div>
                  <div className="num mt-[2px] text-[11.5px] font-bold text-ink-3">
                    {formatRelative(entry.created_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Sheet>
  )
}
