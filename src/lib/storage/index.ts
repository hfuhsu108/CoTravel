import { SupabaseFileStorage } from './supabaseStorage'
import type { FileStorage } from './types'

export type { FileStorage, UploadOptions } from './types'

// 全 App 唯一的檔案儲存入口。元件只 import 這個 storage，不直接碰任何後端 SDK。
// 未來換 Cloudflare R2：把右側換成 new R2FileStorage() 即可，呼叫端不動。
export const storage: FileStorage = new SupabaseFileStorage()
