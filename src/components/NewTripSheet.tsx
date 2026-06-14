import TripFormSheet from './TripFormSheet'
import type { Trip } from '../lib/types'

interface NewTripSheetProps {
  onClose: () => void
  onCreated: (trip: Trip) => void
}

// 建立新旅程：薄包裝 TripFormSheet 的 create 模式（建立/修改共用同一表單，
// 目的地走 Google 地點搜尋並存座標）。建立成功後 TripFormSheet 會顯示邀請碼。
export default function NewTripSheet({ onClose, onCreated }: NewTripSheetProps) {
  return <TripFormSheet mode="create" onClose={onClose} onSaved={onCreated} />
}
