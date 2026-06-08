import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// 全 App 共用單一 Supabase client（Auth + DB + Realtime + Storage）。
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 用 PKCE：OAuth 回跳的授權碼放在 ?code= query string，能與 HashRouter（網址帶 #）共存。
    // auth-js 預設是 implicit（token 放 #hash），一回跳就被路由的 Navigate 蓋掉，session 永遠取不到。
    flowType: 'pkce',
  },
})
