// 外部平台 deep link（階段 7）：kkday/klook/uber/grab 皆無公開下單 API，
// 只能跳轉到對方網站/App 並帶入地點或目的地（見 docs/01 已確認的務實邊界）。
// URL 全集中此檔，元件不自行拼字串，方便日後各平台改版時單點維護。

// 一律新分頁開啟，noopener 防止對方頁面取得 window.opener。
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// KKday：以地點名搜尋（落到搜尋結果頁，使用者再自行挑商品）。
export function kkdaySearchUrl(name: string): string {
  return `https://www.kkday.com/zh-tw/search?keyword=${encodeURIComponent(name)}`
}

// Klook：同樣以地點名搜尋。
export function klookSearchUrl(name: string): string {
  return `https://www.klook.com/zh-TW/search/?query=${encodeURIComponent(name)}`
}

// Uber：universal link（m.uber.com/ul）在瀏覽器即可用，會引導開 App 或續用網頁，
// 並預填下車點座標與名稱。鍵含中括號為 Uber 文件規格，只 encode 值不 encode 鍵。
export function uberRideUrl(lat: number, lng: number, name: string): string {
  const params = [
    'action=setPickup',
    'pickup=my_location',
    `dropoff[latitude]=${lat}`,
    `dropoff[longitude]=${lng}`,
    `dropoff[nickname]=${encodeURIComponent(name)}`,
  ].join('&')
  return `https://m.uber.com/ul/?${params}`
}

// Grab：無公開可預填目的地的 web deep link（不像 Uber 的 universal link），
// 只能落到首頁讓使用者自行操作。保留獨立函式，日後若有官方 deep link 再替換。
export function grabUrl(): string {
  return 'https://www.grab.com/'
}

// Google 地圖：以座標開啟（有 place_id 則精準對到該地點，避免大型場所導到形心）。
// 詳情頁、書籤詳情、地圖小卡的「在 Google 地圖開啟」共用此格式，單點維護。
export function googleMapsPlaceUrl(lat: number, lng: number, placeId?: string | null): string {
  const base = 'https://www.google.com/maps/search/?api=1'
  const q = `&query=${lat},${lng}`
  const pid = placeId ? `&query_place_id=${placeId}` : ''
  return `${base}${q}${pid}`
}
