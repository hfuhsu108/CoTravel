import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

// 區域圓圈：以命令式 google.maps.Circle 畫地理半徑（隨縮放正確縮放）。
// 注意：google overlay 不吃 CSS 變數，故從 :root 讀出 --primary 實際色值，仍能跟著 theme。
// 限制：Circle 不支援虛線描邊（僅 Polyline 有 icons dash），故用實線細描邊＋半透明填色近似原型。
interface MapCircleProps {
  center: google.maps.LatLngLiteral
  radius: number // 公尺
  selected?: boolean
  onClick?: () => void
}

function primaryColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  return v || '#7a6cf0'
}

export default function MapCircle({ center, radius, selected = false, onClick }: MapCircleProps) {
  const map = useMap()
  const circleRef = useRef<google.maps.Circle | null>(null)
  const clickRef = useRef(onClick)
  clickRef.current = onClick

  // 建立 / 清理（map 就緒後一次）
  useEffect(() => {
    if (!map) return
    const color = primaryColor()
    const circle = new google.maps.Circle({
      map,
      center,
      radius,
      strokeColor: color,
      strokeOpacity: 0.7,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.14,
      clickable: !!clickRef.current,
    })
    circle.addListener('click', () => clickRef.current?.())
    circleRef.current = circle
    return () => {
      google.maps.event.clearInstanceListeners(circle)
      circle.setMap(null)
      circleRef.current = null
    }
    // 僅在 map 就緒時建立；後續變更走下面的 update effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // 中心 / 半徑 / 選中態變更時更新（不重建 overlay）
  useEffect(() => {
    const c = circleRef.current
    if (!c) return
    c.setCenter(center)
    c.setRadius(radius)
    c.setOptions({ strokeWeight: selected ? 3 : 2, fillOpacity: selected ? 0.2 : 0.14 })
  }, [center.lat, center.lng, radius, selected])

  return null
}
