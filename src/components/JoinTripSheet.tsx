import { useState } from 'react'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Field, { inputClassName } from './ui/Field'
import Icon from './Icon'
import { joinTripByCode } from '../lib/api'
import { errMessage } from '../lib/errMessage'
import type { Trip } from '../lib/types'

interface JoinTripSheetProps {
  onClose: () => void
  onJoined: (trip: Trip) => void
}

// 已登入時用邀請碼加入另一半的旅程。
export default function JoinTripSheet({ onClose, onJoined }: JoinTripSheetProps) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleJoin() {
    const c = code.trim()
    if (!c) {
      setErr('請輸入邀請碼')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const trip = await joinTripByCode(c)
      onJoined(trip)
    } catch (e) {
      setErr(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-[22px] pt-[6px]">
        <h2 className="text-xl font-bold">用邀請碼加入</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center text-ink-2"
          aria-label="關閉"
        >
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="min-h-0 overflow-y-auto px-[22px] pb-[34px] pt-[18px]">
        <Field label="另一半給你的 6 碼邀請碼">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="例如 LOVE26"
            maxLength={6}
            className={`${inputClassName} text-center font-round font-bold uppercase tracking-[0.3em]`}
          />
        </Field>
        {err && <p className="mb-2 text-[13px] text-danger">{err}</p>}
        <Button variant="primary" block disabled={busy} onClick={handleJoin}>
          <Icon name="users" size={18} /> {busy ? '加入中…' : '加入伴侶'}
        </Button>
      </div>
    </Sheet>
  )
}
