import { supabase } from '../supabase'
import type { FileStorage, UploadOptions } from './types'

// Supabase Storage 實作。所有檔案放在單一 bucket，trip 內以路徑分隔（如 `<tripId>/<docId>`）。
// 之後換 R2 時，只要新增一個實作此介面的 class，並改 storage/index.ts 的匯出即可。
const BUCKET = 'documents'

// bucket 設為 private，故用簽章 URL；離線需求改用 download() 取 Blob 自行快取。
const SIGNED_URL_TTL_SECONDS = 60 * 60

export class SupabaseFileStorage implements FileStorage {
  async upload(
    path: string,
    file: File | Blob,
    options?: UploadOptions,
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        upsert: options?.upsert ?? false,
        contentType: options?.contentType,
      })
    if (error) throw error
    return data.path
  }

  async getUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error) throw error
    return data.signedUrl
  }

  async remove(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  }

  async download(path: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (error) throw error
    return data
  }
}
