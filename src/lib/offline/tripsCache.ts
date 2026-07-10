// 旅程列表快照（localStorage）：每次線上載入成功就覆寫，離線時唯讀呈現。
// 資料量小（兩人自用、旅程數少），不需要進 IndexedDB。
import type { TripWithMembers } from '../types'

const KEY = 'cotravel.tripsCache'

export interface TripsCache {
  trips: TripWithMembers[]
  cachedAt: string
}

export function saveTripsCache(trips: TripWithMembers[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ trips, cachedAt: new Date().toISOString() }))
  } catch {
    // 非致命
  }
}

export function loadTripsCache(): TripsCache | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TripsCache) : null
  } catch {
    return null
  }
}
