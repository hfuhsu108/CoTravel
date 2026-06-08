// 集中讀取與檢查環境變數，避免散落在各處直接讀 import.meta.env。
// 缺金鑰時提早在 console 警告，方便定位（不 throw，讓骨架在未設定時仍能跑起來）。
type EnvKey =
  | 'VITE_SUPABASE_URL'
  | 'VITE_SUPABASE_ANON_KEY'
  | 'VITE_GOOGLE_MAPS_API_KEY'

function read(key: EnvKey): string {
  const value = import.meta.env[key]
  if (!value) {
    console.warn(`[env] 缺少環境變數 ${key}，請複製 .env.example 為 .env 並填入。`)
    return ''
  }
  return value
}

// Supabase 缺金鑰時給 placeholder：createClient 需合法 URL，否則啟動即 throw、整頁白畫面。
// 有 fallback 後至少能看到登入畫面；真正呼叫 Supabase 時才會失敗（console 已先警告）。
export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co',
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY') || 'placeholder-anon-key',
  googleMapsApiKey: read('VITE_GOOGLE_MAPS_API_KEY'),
}
