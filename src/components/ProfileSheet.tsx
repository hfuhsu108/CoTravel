import { useState } from 'react'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Avatar from './Avatar'
import { useAuth } from '../lib/auth'
import { errMessage } from '../lib/errMessage'

// 個人檔案 sheet：頭像 + 暱稱 + Email + 登出。
// 階段 1 僅做登出；帳號設定/通知/離線管理等屬後續階段，故先不放（避免無作用的列）。
export default function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const displayName =
    (meta.full_name as string) || (meta.name as string) || user?.email?.split('@')[0] || '旅人'
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null

  async function handleSignOut() {
    setErr(null)
    setBusy(true)
    try {
      await signOut()
      // session 清空後，旅程畫面在 RequireAuth 下會自動導回 /login
    } catch (e) {
      setErr(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex flex-col items-center gap-2 px-[22px] pb-1 pt-[14px]">
        <Avatar name={displayName} avatarUrl={avatarUrl} size={64} online />
        <h2 className="text-xl font-bold">{displayName}</h2>
        {user?.email && <p className="text-[13px] text-ink-3">{user.email}</p>}
      </div>
      <div className="px-4 pb-[34px] pt-[14px]">
        {err && <p className="mb-2 text-center text-[13px] text-danger">{err}</p>}
        <Button
          variant="plain"
          block
          disabled={busy}
          className="bg-pink-soft text-danger"
          onClick={handleSignOut}
        >
          {busy ? '登出中…' : '登出'}
        </Button>
      </div>
    </Sheet>
  )
}
