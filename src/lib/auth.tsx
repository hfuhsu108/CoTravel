import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { upsertMyProfile } from './api'
import { isPushSupported, subscribeToPush } from './pushSubscription'
import { saveLastAuth, loadLastAuth, clearLastAuth, type LastAuth } from './offline/lastAuth'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  // 回傳 needsConfirm：若專案開啟 Email 確認，註冊後尚未取得 session
  signUp: (email: string, password: string) => Promise<{ needsConfirm: boolean }>
  signOut: () => Promise<void>
  // 離線授權：本機曾登入過的使用者摘要。離線時 session 取不到，改用它讓 App 進唯讀模式
  offlineUser: LastAuth | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [offlineUser, setOfflineUser] = useState<LastAuth | null>(null)

  useEffect(() => {
    let active = true
    const finish = (s: Session | null) => {
      if (!active) return
      setSession(s)
      setLoading(false)
    }
    // 初次載入：讀現有 session（OAuth 回跳的 code 也會在此被 supabase-js 交換）
    const sessionPromise = supabase.auth.getSession().then(({ data }) => data.session)
    if (!navigator.onLine) {
      // 離線：token 過期時 getSession 會等網路刷新而卡住——2.5 秒沒回就走離線授權，
      // 之後若 promise 仍回來（含恢復連線後），下面的 then 會補上真 session
      const timeout = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 2500))
      void Promise.race([sessionPromise, timeout]).then((res) => {
        if (!active) return
        if (res === 'timeout' || res === null) {
          setOfflineUser(loadLastAuth())
          setLoading(false)
        } else {
          finish(res)
        }
      })
      sessionPromise
        .then((s) => {
          if (active && s) {
            setOfflineUser(null)
            setSession(s)
          }
        })
        .catch(() => {})
    } else {
      sessionPromise.then(finish).catch(() => finish(null))
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next) setOfflineUser(null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const user = session?.user ?? null

  // 登入後確保 profile 存在（觸發器的後備）。依 user id 觸發一次。
  useEffect(() => {
    if (!user) return
    // 順手留一份登入摘要，供下次離線開 App 時進唯讀模式（欄位取法同 TripList 的頭像來源）
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    saveLastAuth({
      id: user.id,
      name: (meta.full_name as string) || (meta.name as string) || user.email?.split('@')[0] || '我',
      avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || null,
    })
    upsertMyProfile(user).catch((e) => console.error('[auth] 建立/同步 profile 失敗', e))
    // 若通知已授權，靜默同步 push subscription（不主動彈權限對話框——iOS 要使用者手勢）
    if (isPushSupported() && Notification.permission === 'granted') {
      subscribeToPush(user.id).catch((e) => console.warn('[auth] 推播訂閱同步失敗', e))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const value: AuthContextValue = {
    session,
    user,
    loading,
    offlineUser,
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // 回跳回本 app（dev 為 http://localhost:5173/，build 含 /CoTravel/ 子路徑）
        options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
      })
      if (error) throw error
    },
    async signInWithPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return { needsConfirm: !data.session }
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // 清掉離線授權，否則登出後離線重開仍會看到前帳號資料
      clearLastAuth()
      setOfflineUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 內使用')
  return ctx
}

// 路由守衛：未登入導向 /login；載入中先顯示過場，避免閃一下登入頁
export function RequireAuth() {
  const { session, loading, offlineUser } = useAuth()
  const location = useLocation()
  if (loading) {
    return <div className="flex h-full items-center justify-center text-ink-3">載入中…</div>
  }
  // 離線且本機曾登入過 → 放行進唯讀模式，不踢去無法登入的登入頁
  if (!session && !offlineUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
