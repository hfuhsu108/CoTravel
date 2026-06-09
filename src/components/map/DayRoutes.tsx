import { useEffect } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Transport } from '../../lib/types'

// 當天逐段交通的地圖路線（階段 3，取代舊 RoutePolyline 的單一直線）。
// 每相鄰段：有 transport.route_polyline → 解碼畫實線（真實 Directions 路線）；
// 否則（自定義 / 未匯入）→ 虛線直線連接。命令式管理 Polyline，卸載/重算時清除。
export interface RouteStop {
  id: string
  lat: number
  lng: number
}

interface DayRoutesProps {
  stops: RouteStop[] // 當天依 order_index、且有座標的項目（含 area 圓心）
  transportByPair: Map<string, Transport> // key: `${fromId}|${toId}`
  visible: boolean
}

function primaryColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  return v || '#7a6cf0'
}

export default function DayRoutes({ stops, transportByPair, visible }: DayRoutesProps) {
  const map = useMap()
  const geometry = useMapsLibrary('geometry')

  useEffect(() => {
    if (!map || !visible || stops.length < 2) return
    const color = primaryColor()
    const lines: google.maps.Polyline[] = []

    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]
      const b = stops[i + 1]
      const t = transportByPair.get(`${a.id}|${b.id}`)

      if (t?.route_polyline && geometry) {
        // 真實路線：實線
        lines.push(
          new google.maps.Polyline({
            map,
            path: geometry.encoding.decodePath(t.route_polyline),
            geodesic: false,
            strokeColor: color,
            strokeOpacity: 0.9,
            strokeWeight: 4,
          }),
        )
      } else {
        // 未匯入 / 自定義：虛線直線（靠 icons 畫點，Polyline 才支援虛線）
        lines.push(
          new google.maps.Polyline({
            map,
            path: [
              { lat: a.lat, lng: a.lng },
              { lat: b.lat, lng: b.lng },
            ],
            geodesic: true,
            strokeOpacity: 0,
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
          }),
        )
      }
    }

    return () => {
      for (const l of lines) l.setMap(null)
    }
  }, [map, geometry, visible, stops, transportByPair])

  return null
}
