// Google Directions 路線匯入（階段 3 起；功能 2 擴充為多路線可挑 + 大眾運輸轉乘步驟）。
// 供 TransitDetail 在選 walk/transit/drive 時呼叫，取回多條替代路線（時間/距離/車資/步驟/polyline）。
// routes / geometry library 由 useMapsLibrary 載入後傳入（已在 APIProvider 內，沿用 PlaceSearch 慣例）。
import type { TransitStep } from './types'

// 走 Directions 的三種模式（custom/bike/flight 不經此）
export type DirectionsMode = 'walk' | 'transit' | 'drive'

// 一條路線選項（功能 2：列給使用者挑）
export interface RouteOption {
  duration_min: number
  distance_m: number
  cost_text: string | null // 大眾運輸有 fare 時帶入，否則 null
  encodedPath: string // google encoded polyline（畫真實路線用）
  steps: TransitStep[] // 步行/搭乘步驟（顯示轉乘與公車號）
  transfers: number // 轉乘次數（搭乘段數 - 1，下限 0）
}

function travelModeOf(mode: DirectionsMode): google.maps.TravelMode {
  switch (mode) {
    case 'walk':
      return google.maps.TravelMode.WALKING
    case 'transit':
      return google.maps.TravelMode.TRANSIT
    case 'drive':
      return google.maps.TravelMode.DRIVING
  }
}

// Google 交通工具型別 → 中文（優先用 API 已在地化的 vehicle.name）
function vehicleZh(type: string | undefined): string | null {
  switch (type) {
    case 'BUS':
      return '公車'
    case 'SUBWAY':
    case 'METRO_RAIL':
      return '地鐵'
    case 'HEAVY_RAIL':
    case 'RAIL':
    case 'COMMUTER_TRAIN':
    case 'HIGH_SPEED_TRAIN':
      return '火車'
    case 'TRAM':
      return '路面電車'
    case 'FERRY':
      return '渡輪'
    case 'CABLE_CAR':
    case 'GONDOLA_LIFT':
      return '纜車'
    default:
      return null
  }
}

function stepOf(step: google.maps.DirectionsStep): TransitStep {
  // 依實際 travel_mode 分類（修正：開車路線的步驟以往被誤標成步行）
  const tm = step.travel_mode
  const mode: TransitStep['mode'] =
    tm === google.maps.TravelMode.TRANSIT
      ? 'transit'
      : tm === google.maps.TravelMode.DRIVING
        ? 'drive'
        : 'walk'
  const t = step.transit
  const vehicleType = t?.line?.vehicle?.type as unknown as string | undefined
  return {
    mode,
    line: mode === 'transit' ? (t?.line?.short_name ?? t?.line?.name ?? null) : null,
    vehicle: mode === 'transit' ? (t?.line?.vehicle?.name ?? vehicleZh(vehicleType)) : null,
    from: t?.departure_stop?.name ?? null,
    to: t?.arrival_stop?.name ?? null,
    num_stops: t?.num_stops ?? null,
    duration_min: Math.max(1, Math.round((step.duration?.value ?? 0) / 60)),
  }
}

function optionOf(
  route: google.maps.DirectionsRoute,
  geometryLib: google.maps.GeometryLibrary,
): RouteOption {
  let seconds = 0
  let meters = 0
  const steps: TransitStep[] = []
  for (const leg of route.legs) {
    seconds += leg.duration?.value ?? 0
    meters += leg.distance?.value ?? 0
    for (const s of leg.steps) steps.push(stepOf(s))
  }
  const transfers = Math.max(0, steps.filter((s) => s.mode === 'transit').length - 1)
  return {
    duration_min: Math.max(1, Math.round(seconds / 60)),
    distance_m: meters,
    cost_text: route.fare?.text ?? null,
    encodedPath: geometryLib.encoding.encodePath(route.overview_path),
    steps,
    transfers,
  }
}

// 已知失敗狀態轉中文（其餘交給 errMessage 顯示原始 message）
function friendlyError(code: string | undefined): Error | null {
  switch (code) {
    case google.maps.DirectionsStatus.REQUEST_DENIED:
      return new Error('路線服務被拒：請確認 Google Cloud 已啟用 Directions API')
    case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
      return new Error('路線查詢已達上限，請稍後再試')
    case google.maps.DirectionsStatus.INVALID_REQUEST:
      return new Error('路線請求無效（起訖點可能缺座標）')
    default:
      return null
  }
}

// 起訖點：有 google_place_id 時用 { placeId }（Google 會對到正式出入口，避免大型場所形心被導到錯站），
// 否則用座標。
export type DirEndpoint = google.maps.Place | google.maps.LatLngLiteral

// 回多條替代路線；查無路線（ZERO_RESULTS / NOT_FOUND）回 []；其餘失敗 throw（含 API 未啟用）。
export async function fetchDirectionsRoutes(
  routesLib: google.maps.RoutesLibrary,
  geometryLib: google.maps.GeometryLibrary,
  origin: DirEndpoint,
  destination: DirEndpoint,
  mode: DirectionsMode,
): Promise<RouteOption[]> {
  const service = new routesLib.DirectionsService()
  try {
    const res = await service.route({
      origin,
      destination,
      travelMode: travelModeOf(mode),
      provideRouteAlternatives: true,
    })
    return res.routes.map((route) => optionOf(route, geometryLib))
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (
      code === google.maps.DirectionsStatus.ZERO_RESULTS ||
      code === google.maps.DirectionsStatus.NOT_FOUND
    ) {
      return []
    }
    throw friendlyError(code) ?? e
  }
}
