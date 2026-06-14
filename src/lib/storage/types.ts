// 檔案儲存抽象介面。元件一律透過此介面存取檔案，不可直接呼叫 Supabase Storage，
// 以便日後無痛替換成 Cloudflare R2（見 docs/02 關鍵決策 1）。

export interface UploadOptions {
  // 是否允許覆寫同路徑既有檔案
  upsert?: boolean
  contentType?: string
}

export interface FileStorage {
  // 上傳檔案，回傳可用來取得 URL / 刪除的儲存路徑（含 bucket 內相對路徑）
  upload(path: string, file: File | Blob, options?: UploadOptions): Promise<string>

  // 取得可公開或簽章存取的 URL（簽章 URL 由實作決定有效期）
  getUrl(path: string): Promise<string>

  // 刪除檔案
  remove(path: string): Promise<void>

  // 刪除某前綴（資料夾）下的所有檔案（刪整趟旅程時清空 <tripId>/ 用）
  removeByPrefix(prefix: string): Promise<void>

  // 下載檔案內容（供 PWA 離線快取使用）
  download(path: string): Promise<Blob>
}
