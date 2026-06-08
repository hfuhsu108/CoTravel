import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { listMyTrips, joinTripByCode } from '../lib/api'
import { takePendingInvite } from '../lib/pendingInvite'
import { errMessage } from '../lib/errMessage'
import { getTripStatus, startSortKey, endSortKey } from '../lib/tripStatus'
import type { Trip, TripWithMembers } from '../lib/types'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import Avatar from '../components/Avatar'
import Button from '../components/ui/Button'
import GroupHeader from '../components/GroupHeader'
import TripCard from '../components/TripCard'
import NewTripSheet from '../components/NewTripSheet'
import JoinTripSheet from '../components/JoinTripSheet'
import ProfileSheet from '../components/ProfileSheet'

type SheetKind = null | 'new' | 'join' | 'profile'

// 畫面 1：旅程列表。依狀態分三組，FAB 建立、邀請碼加入；串 Supabase。
export default function TripList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const meId = user?.id ?? ''

  const [trips, setTrips] = useState<TripWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [pastOpen, setPastOpen] = useState(false)

  const refresh = useCallback(async () => {
    setTrips(await listMyTrips())
  }, [])

  // 初次載入：先兌換登入頁暫存的邀請碼（若有），再撈列表
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const pending = takePendingInvite()
        if (pending) {
          try {
            await joinTripByCode(pending)
          } catch (e) {
            // 兌換失敗（已加入/碼失效）不擋列表載入，只提示
            if (active) setNotice(errMessage(e))
          }
        }
        const data = await listMyTrips()
        if (active) setTrips(data)
      } catch (e) {
        if (active) setError(errMessage(e))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  function openTrip(trip: TripWithMembers) {
    navigate(`/trips/${trip.id}`)
  }

  function handleJoined(_trip: Trip) {
    setSheet(null)
    void refresh().catch((e) => setError(errMessage(e)))
  }

  // 我的頭像（appbar）取自帳號 metadata
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const meName =
    (meta.full_name as string) || (meta.name as string) || user?.email?.split('@')[0] || '我'
  const meAvatar = (meta.avatar_url as string) || (meta.picture as string) || null

  const ongoing = trips.filter((t) => getTripStatus(t) === 'ongoing')
  const upcoming = trips
    .filter((t) => getTripStatus(t) === 'upcoming')
    .sort((a, b) => startSortKey(a).localeCompare(startSortKey(b)))
  const past = trips
    .filter((t) => getTripStatus(t) === 'past')
    .sort((a, b) => endSortKey(b).localeCompare(endSortKey(a)))

  const isEmpty = !loading && !error && trips.length === 0

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <header
        className="flex items-center justify-between gap-3 px-5 pb-[14px]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}
      >
        <div className="flex items-center gap-[10px]">
          <Logo size={32} />
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">同行</h1>
        </div>
        <button type="button" onClick={() => setSheet('profile')} aria-label="個人檔案">
          <Avatar name={meName} avatarUrl={meAvatar} size={38} online />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-[30px] pt-1">
        {notice && (
          <div className="mb-3 mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {notice}
          </div>
        )}

        {loading && <div className="flex h-40 items-center justify-center text-ink-3">載入中…</div>}

        {error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button
              variant="soft"
              onClick={() => {
                setLoading(true)
                refresh()
                  .catch((e) => setError(errMessage(e)))
                  .finally(() => setLoading(false))
              }}
            >
              重新載入
            </Button>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <div className="ph mb-2 flex h-[140px] w-[170px] items-center justify-center rounded-xl">
              <span className="ph-label">還沒有旅程</span>
            </div>
            <h2 className="text-[21px] font-bold">還沒有任何旅程</h2>
            <p className="max-w-[250px] text-[15px] leading-[1.55] text-ink-2">
              建立第一趟旅程，邀請另一半，一起在地圖上排出完美行程。
            </p>
            <Button variant="primary" className="mt-3" onClick={() => setSheet('new')}>
              <Icon name="plus" size={19} /> 建立第一趟旅程
            </Button>
            <Button variant="plain" className="text-ink-3" onClick={() => setSheet('join')}>
              <Icon name="users" size={18} /> 用邀請碼加入
            </Button>
          </div>
        )}

        {!loading && !error && trips.length > 0 && (
          <>
            {ongoing.length > 0 && (
              <>
                <GroupHeader icon="pin" title="進行中" count={ongoing.length} color="var(--ok)" />
                {ongoing.map((t) => (
                  <div key={t.id} className="mb-[14px]">
                    <TripCard trip={t} meId={meId} big onOpen={openTrip} />
                  </div>
                ))}
              </>
            )}

            {upcoming.length > 0 && (
              <>
                <GroupHeader
                  icon="plane"
                  title="即將出發"
                  count={upcoming.length}
                  color="var(--primary)"
                />
                <div className="flex flex-col gap-[14px]">
                  {upcoming.map((t) => (
                    <TripCard key={t.id} trip={t} meId={meId} onOpen={openTrip} />
                  ))}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <GroupHeader
                  icon="clock"
                  title="過往旅程"
                  count={past.length}
                  color="var(--ink-3)"
                  collapsible
                  open={pastOpen}
                  onToggle={() => setPastOpen((o) => !o)}
                />
                {pastOpen && (
                  <div className="flex flex-col gap-[14px]">
                    {past.map((t) => (
                      <div key={t.id} style={{ opacity: 0.82 }}>
                        <TripCard trip={t} meId={meId} onOpen={openTrip} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setSheet('join')}
              className="mx-auto mt-7 block text-[13px] font-bold text-ink-3"
            >
              有邀請碼？加入另一半的旅程
            </button>
          </>
        )}
      </div>

      {!isEmpty && !loading && (
        <button
          type="button"
          onClick={() => setSheet('new')}
          className="absolute bottom-[30px] right-[18px] z-[42] flex h-[60px] w-[60px] items-center justify-center rounded-[21px] bg-primary text-white active:scale-[0.93]"
          style={{ boxShadow: '0 10px 26px rgba(122,108,240,0.45)' }}
          aria-label="建立新旅程"
        >
          <Icon name="plus" size={28} />
        </button>
      )}

      {sheet === 'new' && (
        <NewTripSheet
          onClose={() => setSheet(null)}
          onCreated={() => void refresh().catch((e) => setError(errMessage(e)))}
        />
      )}
      {sheet === 'join' && <JoinTripSheet onClose={() => setSheet(null)} onJoined={handleJoined} />}
      {sheet === 'profile' && <ProfileSheet onClose={() => setSheet(null)} />}
    </div>
  )
}
