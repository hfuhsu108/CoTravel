import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { setPendingInvite } from '../lib/pendingInvite'
import { errMessage } from '../lib/errMessage'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import Button from '../components/ui/Button'
import Field, { inputClassName } from '../components/ui/Field'

const GRADIENT =
  'radial-gradient(700px 420px at 50% -8%, var(--primary-soft) 0%, transparent 60%), linear-gradient(180deg, #fff, var(--primary-softer) 55%, var(--pink-soft))'

const eyebrow = 'font-round text-xs font-bold uppercase tracking-[0.14em] text-ink-3'

type Mode = null | 'email' | 'pair' | 'join'

// 畫面 0：登入 / 配對。Google 為主，Email+密碼為後備；配對採旅程層級邀請碼。
export default function Login() {
  const { session, loading, signInWithGoogle, signInWithPassword, signUp } = useAuth()

  const [mode, setMode] = useState<Mode>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (loading) {
    return <div className="flex h-full items-center justify-center text-ink-3">載入中…</div>
  }
  // 已登入（含 OAuth 回跳完成）→ 進旅程列表
  if (session) return <Navigate to="/trips" replace />

  function go(next: Mode) {
    setErr(null)
    setInfo(null)
    setMode(next)
  }

  async function handleGoogle() {
    setErr(null)
    setBusy(true)
    try {
      await signInWithGoogle()
      // 成功會跳轉到 Google，瀏覽器離開本頁，不需重設 busy
    } catch (e) {
      setErr(errMessage(e))
      setBusy(false)
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setInfo(null)
    setBusy(true)
    try {
      if (authMode === 'signup') {
        const { needsConfirm } = await signUp(email, password)
        if (needsConfirm) {
          setInfo('確認信已寄出，請點信中連結完成註冊後再回來登入。')
          setBusy(false)
          return
        }
      } else {
        await signInWithPassword(email, password)
      }
      // session 變更會觸發上方自動導向，不手動 navigate
    } catch (e) {
      setErr(errMessage(e))
      setBusy(false)
    }
  }

  // 加入流程：先暫存邀請碼，登入後在旅程列表自動兌換
  function handleJoinWithGoogle() {
    const code = joinCode.trim()
    if (!code) return setErr('請輸入邀請碼')
    setPendingInvite(code)
    void handleGoogle()
  }
  function handleJoinWithEmail() {
    const code = joinCode.trim()
    if (!code) return setErr('請輸入邀請碼')
    setPendingInvite(code)
    go('email')
    setAuthMode('signin')
  }

  return (
    <div className="flex h-full flex-col" style={{ background: GRADIENT }}>
      <div className="flex flex-1 flex-col overflow-y-auto px-[30px]">
        <div className="h-[132px] flex-none" />

        <div className="flex animate-fadeup flex-col items-center text-center">
          <Logo size={76} />
          <h1 className="mt-6 text-[31px] font-bold tracking-[-0.02em]">同行</h1>
          <p className="mt-[10px] max-w-[240px] text-base leading-[1.5] text-ink-2">
            兩人一起，把行程排好。
            <br />
            地圖、文件、行李，一個 App 全搞定。
          </p>
        </div>

        <div className="h-[46px] flex-none" />

        {mode === null && (
          <div className="flex animate-fadeup flex-col gap-3">
            <Button variant="ghost" block className="h-[54px]" disabled={busy} onClick={handleGoogle}>
              <span className="flex" style={{ color: '#4285F4' }}>
                <Icon name="google" size={20} fill />
              </span>
              使用 Google 登入
            </Button>
            <Button
              variant="dark"
              block
              className="h-[54px]"
              onClick={() => {
                go('email')
                setAuthMode('signin')
              }}
            >
              <Icon name="mail" size={19} /> 使用 Email 登入
            </Button>
            <div className="my-[6px] text-center text-[13px] text-ink-3">— 第一次使用 —</div>
            <div className="flex gap-[10px]">
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-[7px] rounded-md bg-primary-soft px-2 py-4 font-bold text-primary-deep transition active:scale-[0.97]"
                onClick={() => go('pair')}
              >
                <Icon name="sparkle" size={22} />
                <span className="text-sm">建立配對</span>
              </button>
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-[7px] rounded-md bg-primary-soft px-2 py-4 font-bold text-primary-deep transition active:scale-[0.97]"
                onClick={() => go('join')}
              >
                <Icon name="users" size={22} />
                <span className="text-sm">用邀請碼加入</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'email' && (
          <form className="animate-fadeup rounded-lg bg-surface p-[22px] shadow-2" onSubmit={handleEmail}>
            <div className={`${eyebrow} mb-3`}>{authMode === 'signin' ? 'Email 登入' : '建立帳號'}</div>
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClassName}
              />
            </Field>
            <Field label="密碼">
              <input
                type="password"
                required
                minLength={6}
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 碼"
                className={inputClassName}
              />
            </Field>
            {info && <p className="mb-2 text-[13px] text-ok">{info}</p>}
            {err && <p className="mb-2 text-[13px] text-danger">{err}</p>}
            <Button type="submit" variant="primary" block disabled={busy}>
              {authMode === 'signin' ? '登入' : '註冊並登入'}
            </Button>
            <button
              type="button"
              className="mt-3 w-full text-center text-[13px] text-ink-3"
              onClick={() => {
                setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'))
                setErr(null)
                setInfo(null)
              }}
            >
              {authMode === 'signin' ? '還沒有帳號？改用註冊' : '已有帳號？改用登入'}
            </button>
            <Button type="button" variant="plain" block className="mt-1" onClick={() => go(null)}>
              返回
            </Button>
          </form>
        )}

        {mode === 'pair' && (
          <div className="animate-fadeup rounded-lg bg-surface p-[22px] shadow-2">
            <div className={`${eyebrow} mb-[10px]`}>建立配對</div>
            <p className="mb-4 text-sm leading-[1.5] text-ink-2">
              登入後建立你們的第一趟旅程，系統會給你一組邀請碼；把它分享給另一半，對方輸入就能一起編行程。
            </p>
            {err && <p className="mb-2 text-[13px] text-danger">{err}</p>}
            <Button variant="primary" block disabled={busy} onClick={handleGoogle}>
              <span className="flex" style={{ color: '#fff' }}>
                <Icon name="google" size={18} fill />
              </span>
              使用 Google 登入開始
            </Button>
            <Button
              variant="plain"
              block
              className="mt-1"
              onClick={() => {
                go('email')
                setAuthMode('signup')
              }}
            >
              改用 Email 註冊
            </Button>
            <Button variant="plain" block className="mt-1" onClick={() => go(null)}>
              返回
            </Button>
          </div>
        )}

        {mode === 'join' && (
          <div className="animate-fadeup rounded-lg bg-surface p-[22px] shadow-2">
            <div className={`${eyebrow} mb-[10px]`}>輸入邀請碼</div>
            <Field label="另一半給你的 6 碼邀請碼">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="例如 LOVE26"
                maxLength={6}
                className={`${inputClassName} text-center font-round font-bold uppercase tracking-[0.3em]`}
              />
            </Field>
            {err && <p className="mb-2 text-[13px] text-danger">{err}</p>}
            <Button variant="primary" block disabled={busy} onClick={handleJoinWithGoogle}>
              <span className="flex" style={{ color: '#fff' }}>
                <Icon name="google" size={18} fill />
              </span>
              用 Google 登入並加入
            </Button>
            <Button variant="plain" block className="mt-1" onClick={handleJoinWithEmail}>
              改用 Email 登入加入
            </Button>
            <Button variant="plain" block className="mt-1" onClick={() => go(null)}>
              返回
            </Button>
          </div>
        )}

        {mode === null && err && <p className="mt-3 text-center text-[13px] text-danger">{err}</p>}

        <div className="min-h-[30px] flex-1" />
        <p className="my-4 mb-[30px] text-center text-xs text-ink-4">登入即表示同意服務條款與隱私權政策</p>
      </div>
    </div>
  )
}
