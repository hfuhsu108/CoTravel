// 點地圖上的 Google 地標（POI）時，用 Places API (New) 抓取基本資訊（功能 4）。
// 沿用 PlaceSearch 的 Place.fetchFields 模式；需在 Google Cloud 啟用「Places API (New)」。
// 由 TripMap（位於 APIProvider 內、已透過 useMapsLibrary('places') 載入）傳入 placesLib，
// 不依賴全域 google.maps.places，避免地圖載入完成、places 尚未載入時的競態。

export interface PoiDetails {
  name: string
  lat: number | null
  lng: number | null
  google_place_id: string
  photo_url: string | null
  address: string | null
  rating: number | null
  userRatingCount: number | null
}

export async function fetchPoiDetails(
  placesLib: google.maps.PlacesLibrary,
  placeId: string,
): Promise<PoiDetails> {
  const place = new placesLib.Place({ id: placeId })
  await place.fetchFields({
    fields: ['displayName', 'location', 'formattedAddress', 'rating', 'userRatingCount', 'photos'],
  })
  return {
    name: place.displayName ?? '未命名地點',
    lat: place.location?.lat() ?? null,
    lng: place.location?.lng() ?? null,
    google_place_id: place.id ?? placeId,
    photo_url: place.photos?.[0]?.getURI({ maxWidth: 400 }) ?? null,
    address: place.formattedAddress ?? null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
  }
}
