import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

// 當天定點依序連起的虛線（直線，非 Directions——真實路線屬階段 3）。
// 命令式 google.maps.Polyline，用 icons 做虛線（Polyline 才支援虛線，Circle 不行）。
interface RoutePolylineProps {
  points: google.maps.LatLngLiteral[] // 已依 order_index 排序的定點座標
  visible: boolean
}

function primaryColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  return v || '#7a6cf0'
}

export default function RoutePolyline({ points, visible }: RoutePolylineProps) {
  const map = useMap()
  const lineRef = useRef<google.maps.Polyline | null>(null)

  useEffect(() => {
    if (!map) return
    const color = primaryColor()
    const line = new google.maps.Polyline({
      geodesic: true,
      strokeOpacity: 0, // 底線透明，靠 icons 畫虛線點
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.85,
            strokeColor: color,
            strokeWeight: 3,
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
    })
    lineRef.current = line
    return () => {
      line.setMap(null)
      lineRef.current = null
    }
  }, [map])

  useEffect(() => {
    const line = lineRef.current
    if (!line || !map) return
    line.setPath(points)
    line.setMap(visible && points.length >= 2 ? map : null)
  }, [map, points, visible])

  return null
}
