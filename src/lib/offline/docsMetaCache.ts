// 文件分頁的中繼資料離線快照（獨立 IndexedDB）：每次線上載入成功就覆寫整包，
// 離線開文件匣時 getTripWithMembers+listDocuments 走網路必失敗，改用此快照唯讀還原清單，
// 讓已下載（docCache）的檔案仍打得開。沿用 itineraryCache 的「獨立 DB + 薄包裝」模式，
// 但用另一個 DB 名，避免動到既有快取的 version。
import type { Document, TripMemberWithProfile } from '../types'

// 文件分頁初載撈的同一組中繼資料（皆為可結構化複製的純列物件）。
export interface DocsSnapshot {
  members: TripMemberWithProfile[]
  tripStart: string | null
  tripEnd: string | null
  documents: Document[]
  linkCounts: [string, number][] // Map 不直接 JSON 化，統一存 entries，還原時 new Map()
  cachedAt: string // ISO；除錯/未來顯示「快取於何時」用
}

const DB_NAME = 'cotravel-docs-meta'
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
    req.onerror = () => reject(req.error ?? new Error('無法開啟離線文件中繼資料庫'))
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
        req.onerror = () => reject(req.error ?? new Error('離線文件中繼資料庫操作失敗'))
      }),
  )
}

// 以 tripId 為 key 覆寫整包快照（每次成功載入時呼叫）。
export function saveDocsSnapshot(tripId: string, snapshot: DocsSnapshot): Promise<void> {
  return tx('readwrite', (s) => s.put(snapshot, tripId)).then(() => undefined)
}

// 取回某趟的文件快照；無則回 null（離線且從未快取時，UI 顯示錯誤或空）。
export async function getDocsSnapshot(tripId: string): Promise<DocsSnapshot | null> {
  const result = await tx<DocsSnapshot | undefined>('readonly', (s) => s.get(tripId))
  return result ?? null
}
