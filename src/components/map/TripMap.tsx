import { Fragment, useEffect, useMemo } from 'react'
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps'
import type { Item } from '../../lib/types'
import { env } from '../../lib/env'
import Icon from '../Icon'
import MapCircle from './MapCircle'
import RoutePolyline from './RoutePolyline'

interface TripMapProps {
  dayItems: Item[] // 當天 scheduled（point + area），已依 order_index 排序
  bookmarks: Item[] // status=bookmark（跨天都顯示）
  selectedItemId: string | null
  showRoute: boolean
  onSelectItem: (item: Item) => void
  onMapClick?: (latLng: google.maps.LatLngLiteral) => void
}

// 無項目時的預設視野（日本中心、低縮放）；有項目則 fitBounds 覆蓋。
const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 }
const DEFAULT_ZOOM = 9

export default function TripMap({
  dayItems,
  bookmarks,
  selectedItemId,
  showRoute,
  onSelectItem,
  onMapClick,
}: TripMapProps) {
  const points = useMemo(() => dayItems.filter((i) => i.type === 'point'), [dayItems])
  const areas = useMemo(() => dayItems.filter((i) => i.type === 'area'), [dayItems])
  // 編號只算定點，依 order_index 順序給 1,2,3…（區域不給編號）
  const numberOf = useMemo(() => new Map(points.map((p, i) => [p.id, i + 1])), [points])
  // 路線：當天定點依序連線（已過濾有座標者）
  const routePoints = useMemo(
    () =>
      points
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ lat: p.lat as number, lng: p.lng as number })),
    [points],
  )

  const fitCoords = useMemo(
    () =>
      [...dayItems, ...bookmarks]
        .filter((i) => i.lat != null && i.lng != null)
        .map((i) => ({ lat: i.lat as number, lng: i.lng as number })),
    [dayItems, bookmarks],
  )

  return (
    <GoogleMap
      mapId={env.googleMapsMapId}
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      gestureHandling="greedy"
      disableDefaultUI
      reuseMaps
      className="absolute inset-0"
      onClick={(e) => {
        if (onMapClick && e.detail.latLng) onMapClick(e.detail.latLng)
      }}
    >
      <FitBounds coords={fitCoords} />
      <RoutePolyline points={routePoints} visible={showRoute} />

      {/* 區域：地理圓圈 + 中央標籤 */}
      {areas.map(
        (a) =>
          a.lat != null &&
          a.lng != null && (
            <Fragment key={a.id}>
              <MapCircle
                center={{ lat: a.lat, lng: a.lng }}
                radius={a.radius_m ?? 300}
                selected={selectedItemId === a.id}
                onClick={() => onSelectItem(a)}
              />
              <AdvancedMarker
                position={{ lat: a.lat, lng: a.lng }}
                anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
                zIndex={selectedItemId === a.id ? 20 : 5}
                onClick={() => onSelectItem(a)}
              >
                <AreaLabel name={a.name} />
              </AdvancedMarker>
            </Fragment>
          ),
      )}

      {/* 書籤：愛心（粉，單一狀態「想去」） */}
      {bookmarks.map(
        (b) =>
          b.lat != null &&
          b.lng != null && (
            <AdvancedMarker
              key={b.id}
              position={{ lat: b.lat, lng: b.lng }}
              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
              zIndex={selectedItemId === b.id ? 21 : 6}
              onClick={() => onSelectItem(b)}
            >
              <HeartMarker dim={!!selectedItemId && selectedItemId !== b.id} />
            </AdvancedMarker>
          ),
      )}

      {/* 定點：編號水滴 pin */}
      {points.map(
        (p) =>
          p.lat != null &&
          p.lng != null && (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM}
              zIndex={selectedItemId === p.id ? 22 : 8}
              onClick={() => onSelectItem(p)}
            >
              <PinMarker
                n={numberOf.get(p.id) ?? 0}
                selected={selectedItemId === p.id}
                dim={!!selectedItemId && selectedItemId !== p.id}
              />
            </AdvancedMarker>
          ),
      )}
    </GoogleMap>
  )
}

// 有項目就 fitBounds，單點則置中放大；座標變動才重算
function FitBounds({ coords }: { coords: google.maps.LatLngLiteral[] }) {
  const map = useMap()
  const key = coords.map((c) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`).join('|')
  useEffect(() => {
    if (!map || coords.length === 0) return
    if (coords.length === 1) {
      map.setCenter(coords[0])
      map.setZoom(14)
      return
    }
    const b = new google.maps.LatLngBounds()
    coords.forEach((c) => b.extend(c))
    map.fitBounds(b, 64)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

function PinMarker({ n, selected, dim }: { n: number; selected: boolean; dim: boolean }) {
  const w = selected ? 44 : 38
  const h = selected ? 54 : 47
  return (
    <div
      style={{
        position: 'relative',
        opacity: dim ? 0.45 : 1,
        transition: 'opacity .2s',
        filter: 'drop-shadow(0 4px 6px rgba(60,46,120,.3))',
      }}
    >
      <svg width={w} height={h} viewBox="0 0 38 47">
        <path
          d="M19 0a19 19 0 0 0-19 19c0 13 19 28 19 28s19-15 19-28A19 19 0 0 0 19 0Z"
          fill={selected ? 'var(--primary-deep)' : 'var(--primary)'}
          stroke="#fff"
          strokeWidth="2.5"
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          top: selected ? 7 : 6,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: selected ? 17 : 15,
          fontFamily: 'var(--ff-round)',
        }}
      >
        {n}
      </span>
    </div>
  )
}

function HeartMarker({ dim }: { dim: boolean }) {
  return (
    <div style={{ opacity: dim ? 0.45 : 1, transition: 'opacity .2s' }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50% 50% 50% 2px',
          transform: 'rotate(45deg)',
          background: 'var(--pink)',
          border: '2.5px solid #fff',
          boxShadow: 'var(--sh-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ transform: 'rotate(-45deg)', color: '#fff', display: 'flex' }}>
          <Icon name="heart" size={13} fill />
        </span>
      </div>
    </div>
  )
}

function AreaLabel({ name }: { name: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: 'var(--primary-deep)',
        background: '#fff',
        padding: '3px 8px',
        borderRadius: 99,
        boxShadow: 'var(--sh-1)',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--ff)',
      }}
    >
      {name}
    </span>
  )
}
