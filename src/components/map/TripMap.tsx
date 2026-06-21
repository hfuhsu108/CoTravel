import { Fragment, useEffect, useMemo } from 'react'
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import type { Item, Transport } from '../../lib/types'
import { displayName } from '../../lib/itinerary'
import { env } from '../../lib/env'
import { errMessage } from '../../lib/errMessage'
import { fetchPoiDetails, type PoiDetails } from '../../lib/places'
import { DEFAULT_LIST_COLOR, DEFAULT_LIST_ICON, safeListIcon } from '../../lib/bookmarkLists'
import Icon, { type IconName } from '../Icon'
import MapCircle from './MapCircle'
import DayRoutes, { type RouteStop } from './DayRoutes'

interface TripMapProps {
  dayItems: Item[] // 當天 scheduled（point + area），已依 order_index 排序
  bookmarks: Item[] // status=bookmark（跨天都顯示）
  listMetaByName: Map<string, { icon: string; color: string }> // 清單名 → icon/顏色（書籤 marker 用）
  transportByPair: Map<string, Transport> // 相鄰段交通（畫真實路線用），key `${fromId}|${toId}`
  selectedItemId: string | null
  showRoute: boolean
  areaMode?: boolean // 圈區域模式時，點 POI 視為選區域中心而非開資訊卡
  // 功能 3：預設視野退路。當天無項目時用 fallbackCenter（旅程目的地）；再無則用 allCoords（整趟項目）。
  fallbackCenter?: google.maps.LatLngLiteral | null
  allCoords: google.maps.LatLngLiteral[]
  onSelectItem: (item: Item) => void
  onMapClick?: (latLng: google.maps.LatLngLiteral) => void
  // 功能 4：點到 Google 地標（POI）→ 抓詳情後回傳；失敗回傳訊息
  onPoiSelected: (poi: PoiDetails) => void
  onPoiError: (message: string) => void
}

// 無項目時的預設視野（日本中心、低縮放）；有項目則 fitBounds 覆蓋。
const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 }
const DEFAULT_ZOOM = 9

export default function TripMap({
  dayItems,
  bookmarks,
  listMetaByName,
  transportByPair,
  selectedItemId,
  showRoute,
  areaMode = false,
  fallbackCenter,
  allCoords,
  onSelectItem,
  onMapClick,
  onPoiSelected,
  onPoiError,
}: TripMapProps) {
  // 載入 places library（POI 點擊查詳情用）；同時確保 Place 建構子可用
  const placesLib = useMapsLibrary('places')
  const points = useMemo(() => dayItems.filter((i) => i.type === 'point'), [dayItems])
  const areas = useMemo(() => dayItems.filter((i) => i.type === 'area'), [dayItems])
  // 編號只算定點，依 order_index 順序給 1,2,3…（區域不給編號）
  const numberOf = useMemo(() => new Map(points.map((p, i) => [p.id, i + 1])), [points])
  // 路線停靠點：當天所有項目（含區域圓心）依序、且有座標者——交通段對應相鄰兩項目
  const stops = useMemo<RouteStop[]>(
    () =>
      dayItems
        .filter((i) => i.lat != null && i.lng != null)
        .map((i) => ({ id: i.id, lat: i.lat as number, lng: i.lng as number })),
    [dayItems],
  )

  // 功能 3：預設視野只看「當天」項目的座標（書籤不再影響）
  const dayCoords = useMemo(
    () =>
      dayItems
        .filter((i) => i.lat != null && i.lng != null)
        .map((i) => ({ lat: i.lat as number, lng: i.lng as number })),
    [dayItems],
  )
  // 退路鏈：當天項目 → 旅程目的地 → 整趟項目 → 預設中心
  const fit = useMemo<{ coords: google.maps.LatLngLiteral[]; singleZoom: number }>(() => {
    if (dayCoords.length > 0) return { coords: dayCoords, singleZoom: 14 }
    if (fallbackCenter) return { coords: [fallbackCenter], singleZoom: 11 }
    if (allCoords.length > 0) return { coords: allCoords, singleZoom: 14 }
    return { coords: [], singleZoom: DEFAULT_ZOOM }
  }, [dayCoords, fallbackCenter, allCoords])

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
        const placeId = e.detail.placeId
        // 點到 Google POI：一律壓掉原生資訊窗。非圈區域模式時抓詳情開自家卡片；
        // 圈區域模式則讓 latLng 往下走（當作選區域中心）。
        if (placeId) e.stop()
        if (!areaMode && placeId && placesLib) {
          fetchPoiDetails(placesLib, placeId)
            .then(onPoiSelected)
            .catch((err) => onPoiError(errMessage(err)))
          return
        }
        if (onMapClick && e.detail.latLng) onMapClick(e.detail.latLng)
      }}
    >
      <FitBounds coords={fit.coords} singleZoom={fit.singleZoom} />
      <DayRoutes stops={stops} transportByPair={transportByPair} visible={showRoute} />

      {/* 區域：地理圓圈 + 中央標籤 */}
      {areas.map(
        (a) =>
          a.lat != null &&
          a.lng != null && (
            <Fragment key={a.id}>
              {/* 圈圈不可點（clickable:false）→ 不再攔截下方 marker/POI 的點擊；
                  區域選取改由中心的 AreaLabel pin 負責（見下方 AdvancedMarker onClick） */}
              <MapCircle
                center={{ lat: a.lat, lng: a.lng }}
                radius={a.radius_m ?? 300}
                selected={selectedItemId === a.id}
              />
              <AdvancedMarker
                position={{ lat: a.lat, lng: a.lng }}
                anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
                zIndex={selectedItemId === a.id ? 20 : 5}
                onClick={() => onSelectItem(a)}
              >
                <AreaLabel name={displayName(a)} />
              </AdvancedMarker>
            </Fragment>
          ),
      )}

      {/* 書籤：水滴，套所屬清單的 icon + 顏色（取 tags 第一個有 metadata 的清單，無則回退預設） */}
      {bookmarks.map((b) => {
        if (b.lat == null || b.lng == null) return null
        let icon: IconName = DEFAULT_LIST_ICON
        let color = DEFAULT_LIST_COLOR
        for (const tag of b.tags) {
          const m = listMetaByName.get(tag)
          if (m) {
            icon = safeListIcon(m.icon)
            color = m.color
            break
          }
        }
        return (
          <AdvancedMarker
            key={b.id}
            position={{ lat: b.lat, lng: b.lng }}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            zIndex={selectedItemId === b.id ? 21 : 6}
            onClick={() => onSelectItem(b)}
          >
            <ListMarker icon={icon} color={color} dim={!!selectedItemId && selectedItemId !== b.id} />
          </AdvancedMarker>
        )
      })}

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

// 有座標就 fitBounds，單點則置中放大（縮放依來源：當天項目 14、目的地退路 11）；座標變動才重算
function FitBounds({
  coords,
  singleZoom,
}: {
  coords: google.maps.LatLngLiteral[]
  singleZoom: number
}) {
  const map = useMap()
  const key = coords.map((c) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`).join('|')
  useEffect(() => {
    if (!map || coords.length === 0) return
    if (coords.length === 1) {
      map.setCenter(coords[0])
      map.setZoom(singleZoom)
      return
    }
    const b = new google.maps.LatLngBounds()
    coords.forEach((c) => b.extend(c))
    map.fitBounds(b, 64)
    // coords 以 key 字串代表，故 exhaustive-deps 對 coords 的告警可忽略
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, singleZoom])
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

// 書籤水滴 marker：套清單顏色為底、清單 icon 為白色描邊（線稿）——填滿會讓線條型圖示（摩天輪、溫泉…）糊成一塊
function ListMarker({ icon, color, dim }: { icon: IconName; color: string; dim: boolean }) {
  return (
    <div style={{ opacity: dim ? 0.45 : 1, transition: 'opacity .2s' }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50% 50% 50% 2px',
          transform: 'rotate(45deg)',
          background: color,
          border: '2.5px solid #fff',
          boxShadow: 'var(--sh-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ transform: 'rotate(-45deg)', color: '#fff', display: 'flex' }}>
          <Icon name={icon} size={14} sw={2.1} />
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
