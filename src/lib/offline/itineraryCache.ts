// 行程離線快取（階段 7）：把一趟旅程的行程文字＋交通整包存進 IndexedDB，
// 落地沒網路時仍能唯讀檢視（地圖、搜尋、即時路線仍需網路，使用者已接受此取捨，見 docs/01）。
// 沿用 docCache.ts 的「獨立 DB + 薄包裝」模式，但用另一個 DB 名，避免動到文件快取的 version。
import type {
  AreaCandidate,
  BookmarkList,
  Day,
  Item,
  Transport,
  TripWithMembers,
} from '../types'

// 一趟旅程的離線快照：即 MapTab 初載撈的同一組資料（皆為可結構化複製的純列物件）。
export interface ItinerarySnapshot {
  trip: TripWithMembers
  days: Day[]
  items: Item[]
  candidates: AreaCandidate[]
  transports: Transport[]
  listMetas: BookmarkList[]
  cachedAt: string // ISO；除錯/未來顯示「快取於何時」用
}

const DB_NAME = 'cotravel-itinerary'
const STORE = 'snapshots'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  // 單例：同一頁不重複開 DB
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('無法開啟離線行程資料庫'))
  })
  return dbPromise
}

// 把單一交易包成 Promise，統一錯誤處理
function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const req = run(transaction.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('離線行程資料庫操作失敗'))
      }),
  )
}

// 以 tripId 為 key 覆寫整包快照（每次成功載入時呼叫）。
export function saveSnapshot(tripId: string, snapshot: ItinerarySnapshot): Promise<void> {
  return tx('readwrite', (s) => s.put(snapshot, tripId)).then(() => undefined)
}

// 取回某趟的快照；無則回 null（離線且從未快取時，UI 提示先連線一次）。
export async function getSnapshot(tripId: string): Promise<ItinerarySnapshot | null> {
  const result = await tx<ItinerarySnapshot | undefined>('readonly', (s) => s.get(tripId))
  return result ?? null
}
