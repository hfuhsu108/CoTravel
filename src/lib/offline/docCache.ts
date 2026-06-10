// 文件離線快取（階段 4）：用原生 IndexedDB 存已下載文件的 Blob，供落地無網路時檢視。
// 以 storage_path 為 key、Blob 為值（IndexedDB 可直接存 Blob）。不依賴 Service Worker，
// 屬應用層快取，下載與移除完全由使用者每份手動控制（見 docs/04 離線模式）。

const DB_NAME = 'cotravel-offline'
const STORE = 'documents'
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
    req.onerror = () => reject(req.error ?? new Error('無法開啟離線資料庫'))
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
        req.onerror = () => reject(req.error ?? new Error('離線資料庫操作失敗'))
      }),
  )
}

export function cacheDoc(path: string, blob: Blob): Promise<void> {
  return tx('readwrite', (s) => s.put(blob, path)).then(() => undefined)
}

export async function getCachedBlob(path: string): Promise<Blob | null> {
  const result = await tx<Blob | undefined>('readonly', (s) => s.get(path))
  return result ?? null
}

export function removeCached(path: string): Promise<void> {
  return tx('readwrite', (s) => s.delete(path)).then(() => undefined)
}

export async function listCachedPaths(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
  return keys.map((k) => String(k))
}
