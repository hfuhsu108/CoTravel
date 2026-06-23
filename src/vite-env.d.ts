/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// vite.config.ts 的 define 注入（見 resolveAppVersion）
declare const __APP_VERSION__: string
declare const __APP_BUILT_AT__: string

// tz-lookup 無官方型別：由經緯度回傳 IANA 時區字串（如 'Asia/Tokyo'）；座標超範圍會 throw。
declare module 'tz-lookup' {
  export default function tzlookup(lat: number, lon: number): string
}
