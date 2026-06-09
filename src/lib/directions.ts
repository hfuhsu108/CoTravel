// Google Directions 路線匯入（階段 3）。供 TransitDetail 在選 walk/transit/drive 時呼叫，
// 取回時間/距離/車資與 encoded polyline（後者快取進 transports.route_polyline，畫在主地圖）。
// routes / geometry library 由 useMapsLibrary 載入後傳入（已在 APIProvider 內，沿用 PlaceSearch 慣例）。

// 走 Directions 的三種模式（custom/bike 不經此）
export type DirectionsMode = 'walk' | 'transit' | 'drive'

export interface DirectionsData {
  duration_min: number
  distance_m: number
  cost_text: string | null // 大眾運輸有 fare 時帶入，否則 null
  encodedPath: string // google encoded polyline（畫真實路線用）
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

// 成功回資料；查無路線（ZERO_RESULTS / NOT_FOUND）回 null 讓 UI 顯示「找不到路線」；
// 其餘失敗 throw（含 API 未啟用），交由呼叫端以 errMessage 顯示，避免誤導成「找不到」。
export async function fetchDirections(
  routesLib: google.maps.RoutesLibrary,
  geometryLib: google.maps.GeometryLibrary,
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  mode: DirectionsMode,
): Promise<DirectionsData | null> {
  const service = new routesLib.DirectionsService()
  try {
    const res = await service.route({
      origin,
      destination,
      travelMode: travelModeOf(mode),
    })
    const route = res.routes[0]
    if (!route) return null

    // transit 可能多段（leg），加總時間與距離
    let seconds = 0
    let meters = 0
    for (const leg of route.legs) {
      seconds += leg.duration?.value ?? 0
      meters += leg.distance?.value ?? 0
    }

    return {
      duration_min: Math.max(1, Math.round(seconds / 60)),
      distance_m: meters,
      cost_text: route.fare?.text ?? null,
      encodedPath: geometryLib.encoding.encodePath(route.overview_path),
    }
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === google.maps.DirectionsStatus.ZERO_RESULTS || code === google.maps.DirectionsStatus.NOT_FOUND) {
      return null
    }
    throw friendlyError(code) ?? e
  }
}
