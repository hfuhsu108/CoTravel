import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { upsertMyProfile } from './api'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  // 回傳 needsConfirm：若專案開啟 Email 確認，註冊後尚未取得 session
  signUp: (email: string, password: string) => Promise<{ needsConfirm: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    // 初次載入：讀現有 session（OAuth 回跳的 code 也會在此被 supabase-js 交換）
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
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
    upsertMyProfile(user).catch((e) => console.error('[auth] 建立/同步 profile 失敗', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const value: AuthContextValue = {
    session,
    user,
    loading,
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
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return <div className="flex h-full items-center justify-center text-ink-3">載入中…</div>
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
