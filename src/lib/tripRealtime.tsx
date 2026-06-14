import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import { getTripWithMembers } from './api'
import { getLatestForeignActivity } from './activity'
import type { ActivityEntry, TripMemberWithProfile } from './types'

// 即時同步（階段 6）：單一 channel 訂閱該 trip 的資料表變更。
// 鐵律：事件 payload 一律不讀內容、只當「該表變了」的訊號 → bump tick，
// 由各分頁依 tripId refetch（refetch 受 RLS 保護）。原因：Realtime 的 DELETE
// 事件不套 RLS 也不吃 filter（官方行為），payload 內容不可信也不完整。
// activity_log 例外：INSERT 有套 RLS 與 filter，payload.new 可直接拿來顯示 banner。

export type TableKey =
  | 'items'
  | 'area_candidates'
  | 'transports'
  | 'lodgings'
  | 'documents'
  | 'packing_items'

const TABLE_KEYS: TableKey[] = [
  'items',
  'area_candidates',
  'transports',
  'lodgings',
  'documents',
  'packing_items',
]

const ZERO_TICKS: Record<TableKey, number> = {
  items: 0,
  area_candidates: 0,
  transports: 0,
  lodgings: 0,
  documents: 0,
  packing_items: 0,
}

export interface TripRealtimeValue {
  // 各表變更遞增 counter：分頁 useEffect 訂閱後靜默 refetch
  ticks: Record<TableKey, number>
  // 旅程成員（Provider 載一次，banner / 通知清單 / 行李分頁共用）
  members: TripMemberWithProfile[]
  // 鈴鐺紅點：有比 lastSeen 新、且非自己的 activity
  unread: boolean
  // 對方最新改動（只由即時事件設定，驅動 banner；初始載入不彈舊訊息）
  latest: ActivityEntry | null
  markSeen: () => void
  dismissBanner: () => void
}

const TripRealtimeContext = createContext<TripRealtimeValue | null>(null)

function seenKey(tripId: string): string {
  return `cotravel:activitySeen:${tripId}`
}

export function TripRealtimeProvider({
  tripId,
  meId,
  children,
}: {
  tripId: string
  meId: string
  children: ReactNode
}) {
  const [ticks, setTicks] = useState<Record<TableKey, number>>(ZERO_TICKS)
  const [members, setMembers] = useState<TripMemberWithProfile[]>([])
  const [unread, setUnread] = useState(false)
  const [latest, setLatest] = useState<ActivityEntry | null>(null)

  // 已知最新一筆對方活動的時間：markSeen 存它而非 client now，避免兩端時鐘誤差
  const latestForeignAtRef = useRef<string | null>(null)

  const bumpAll = useCallback(() => {
    setTicks((t) => {
      const next = { ...t }
      for (const k of TABLE_KEYS) next[k] = t[k] + 1
      return next
    })
  }, [])

  // 查對方最新活動並比對 lastSeen → 設定紅點（初始載入與斷線重連後補課用）
  const refreshUnread = useCallback(async () => {
    try {
      const entry = await getLatestForeignActivity(tripId, meId)
      if (!entry) return
      latestForeignAtRef.current = entry.created_at
      const seen = localStorage.getItem(seenKey(tripId))
      // timestamptz 一律為同格式 ISO 字串，字串比較即時間比較
      if (!seen || entry.created_at > seen) setUnread(true)
    } catch (e) {
      console.warn('[realtime] 讀取未讀活動失敗', e)
    }
  }, [tripId, meId])

  // 成員資料：載一次（成員異動極罕見，不納入即時同步範圍）
  useEffect(() => {
    let active = true
    getTripWithMembers(tripId)
      .then((trip) => {
        if (active && trip) setMembers(trip.members)
      })
      .catch((e) => console.warn('[realtime] 載入成員失敗', e))
    return () => {
      active = false
    }
  }, [tripId])

  useEffect(() => {
    if (!tripId || !meId) return
    void refreshUnread()

    const wasSubscribedRef = { current: false }
    let channel = supabase.channel(`trip-${tripId}`)
    for (const table of TABLE_KEYS) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          // area_candidates 無 trip_id 欄位 → 不掛 filter（INSERT/UPDATE 靠 RLS 限縮）
          ...(table === 'area_candidates' ? {} : { filter: `trip_id=eq.${tripId}` }),
        },
        () => setTicks((t) => ({ ...t, [table]: t[table] + 1 })),
      )
    }
    channel = channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `trip_id=eq.${tripId}` },
      (payload) => {
        const entry = payload.new as ActivityEntry
        if (entry.user_id === meId) return
        latestForeignAtRef.current = entry.created_at
        setLatest(entry)
        setUnread(true)
      },
    )
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (wasSubscribedRef.current) {
          // 斷線重連：離線期間的事件已漏接，全表 refetch + 重查未讀補課
          bumpAll()
          void refreshUnread()
        }
        wasSubscribedRef.current = true
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // realtime-js 內建自動重試，這裡只留線索
        console.warn('[realtime] channel 狀態異常', status)
      }
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tripId, meId, bumpAll, refreshUnread])

  const markSeen = useCallback(() => {
    localStorage.setItem(
      seenKey(tripId),
      latestForeignAtRef.current ?? new Date().toISOString(),
    )
    setUnread(false)
  }, [tripId])

  const dismissBanner = useCallback(() => setLatest(null), [])

  const value: TripRealtimeValue = { ticks, members, unread, latest, markSeen, dismissBanner }
  return <TripRealtimeContext.Provider value={value}>{children}</TripRealtimeContext.Provider>
}

export function useTripRealtime(): TripRealtimeValue {
  const ctx = useContext(TripRealtimeContext)
  if (!ctx) throw new Error('useTripRealtime 必須在 TripRealtimeProvider 內使用')
  return ctx
}
