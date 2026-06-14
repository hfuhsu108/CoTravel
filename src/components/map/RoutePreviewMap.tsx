import { useEffect } from 'react'
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { env } from '../../lib/env'

interface RoutePreviewMapProps {
  path: string | null // encoded polyline（無則用起訖直線）
  from: google.maps.LatLngLiteral | null
  to: google.maps.LatLngLiteral | null
}

function primaryColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  return v || '#7a6cf0'
}

// 交通詳情頂部的真實路線預覽地圖（功能 4）：畫選定/預覽路線的 polyline + 起訖點。
export default function RoutePreviewMap({ path, from, to }: RoutePreviewMapProps) {
  const center = from ?? to ?? { lat: 25.05, lng: 121.5 }
  return (
    <GoogleMap
      mapId={env.googleMapsMapId}
      defaultCenter={center}
      defaultZoom={12}
      gestureHandling="greedy"
      disableDefaultUI
      reuseMaps
      className="absolute inset-0"
    >
      <RouteLine path={path} from={from} to={to} />
      {from && (
        <AdvancedMarker position={from} anchorPoint={AdvancedMarkerAnchorPoint.CENTER}>
          <Dot color="var(--primary)" />
        </AdvancedMarker>
      )}
      {to && (
        <AdvancedMarker position={to} anchorPoint={AdvancedMarkerAnchorPoint.CENTER}>
          <Dot color="var(--primary-deep)" />
        </AdvancedMarker>
      )}
    </GoogleMap>
  )
}

function RouteLine({ path, from, to }: RoutePreviewMapProps) {
  const map = useMap()
  const geometry = useMapsLibrary('geometry')
  const key = `${path ?? ''}|${from?.lat},${from?.lng}|${to?.lat},${to?.lng}`

  useEffect(() => {
    if (!map) return
    let pts: google.maps.LatLngLiteral[] = []
    if (path && geometry) {
      pts = geometry.encoding.decodePath(path).map((p) => ({ lat: p.lat(), lng: p.lng() }))
    } else {
      if (from) pts.push(from)
      if (to) pts.push(to)
    }

    const line =
      pts.length >= 2
        ? new google.maps.Polyline({
            map,
            path: pts,
            strokeColor: primaryColor(),
            strokeOpacity: 0.9,
            strokeWeight: 4,
          })
        : null

    const b = new google.maps.LatLngBounds()
    for (const p of pts) b.extend(p)
    if (from) b.extend(from)
    if (to) b.extend(to)
    if (!b.isEmpty()) map.fitBounds(b, 56)

    return () => line?.setMap(null)
    // key 已涵蓋 path/from/to 的變化，忽略物件參照層級的 deps 告警
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, geometry, key])

  return null
}

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: color,
        border: '2.5px solid #fff',
        boxShadow: 'var(--sh-2)',
      }}
    />
  )
}
