// 文件檢視／離線下載橋接（階段 4）：銜接 storage 抽象層與離線快取（docCache）。
// 元件只呼叫這裡，不直接組 URL，也不直接碰 storage / IndexedDB。
import { storage } from './storage'
import { cacheDoc, getCachedBlob } from './offline/docCache'

// 開啟文件檢視：快取優先（離線可看），否則用線上簽章 URL。皆開新分頁。
// 離線且未快取時，getCachedBlob 回 null + storage.getUrl 因無網路 throw → 由呼叫端先禁用入口。
export async function openDocument(path: string): Promise<void> {
  const blob = await getCachedBlob(path)
  if (blob) {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    // 給新分頁時間載入後再釋放 object URL（提早 revoke 會讓分頁讀不到內容）
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return
  }
  const url = await storage.getUrl(path)
  window.open(url, '_blank', 'noopener,noreferrer')
}

// 下載並寫入離線快取（DocActionsSheet「下載離線」用）
export async function cacheDocument(path: string): Promise<void> {
  const blob = await storage.download(path)
  await cacheDoc(path, blob)
}
