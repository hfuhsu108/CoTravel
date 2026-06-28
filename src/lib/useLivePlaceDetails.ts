import { useEffect, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

// 即時抓的地點資訊（不持久化；抓不到回 null、不影響編輯）
export interface LiveDetails {
  rating: number | null
  address: string | null
  hoursToday: string | null
}

// 週幾營業字串以 Monday 起算，對應 JS getDay()（Sun=0）
export function todayHours(descs: string[] | null | undefined): string | null {
  if (!descs || descs.length === 0) return null
  const idx = (new Date().getDay() + 6) % 7
  return descs[idx] ?? null
}

// 以 Places API (New) 即時抓 rating / 地址 / 今日營業；詳情頁、書籤詳情、地圖小卡共用。
// 無 placeId 或 places library 尚未載入時不查（回 null）；元件需在 APIProvider 內使用。
export function useLivePlaceDetails(placeId: string | null | undefined): LiveDetails | null {
  const places = useMapsLibrary('places')
  const [live, setLive] = useState<LiveDetails | null>(null)

  useEffect(() => {
    if (!places || !placeId) {
      setLive(null)
      return
    }
    let active = true
    ;(async () => {
      try {
        const place = new places.Place({ id: placeId })
        await place.fetchFields({
          fields: ['rating', 'formattedAddress', 'regularOpeningHours'],
        })
        if (!active) return
        setLive({
          rating: place.rating ?? null,
          address: place.formattedAddress ?? null,
          hoursToday: todayHours(place.regularOpeningHours?.weekdayDescriptions),
        })
      } catch (e) {
        console.warn('[useLivePlaceDetails] 即時地點資訊取得失敗', e)
      }
    })()
    return () => {
      active = false
    }
  }, [places, placeId])

  return live
}
