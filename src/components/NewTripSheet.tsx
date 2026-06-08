import { useState } from 'react'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Field, { inputClassName } from './ui/Field'
import Icon from './Icon'
import { createTrip } from '../lib/api'
import { errMessage } from '../lib/errMessage'
import type { Trip } from '../lib/types'

interface NewTripSheetProps {
  onClose: () => void
  onCreated: (trip: Trip) => void
}

// 建立新旅程。對應 prototype 的 NewTripSheet；因採旅程層級邀請，
// 「邀請同伴」改為建立後顯示可分享的 6 碼邀請碼（取代原型的「夥伴自動加入」）。
export default function NewTripSheet({ onClose, onCreated }: NewTripSheetProps) {
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [created, setCreated] = useState<Trip | null>(null)

  const dateWarning = start && end && end < start ? '結束日早於出發日，仍可建立但請確認。' : null

  async function handleCreate() {
    if (!name.trim()) {
      setErr('請輸入旅程名稱')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const trip = await createTrip({
        name: name.trim(),
        destination: destination.trim() || null,
        start_date: start || null,
        end_date: end || null,
      })
      onCreated(trip) // 讓列表立即刷新
      setCreated(trip)
    } catch (e) {
      setErr(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-[22px] pt-[6px]">
        <h2 className="text-xl font-bold">{created ? '旅程建立完成' : '建立新旅程'}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center text-ink-2"
          aria-label="關閉"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {!created ? (
        <>
          <div className="flex-1 overflow-y-auto px-[22px] pt-[18px]">
            <Field label="旅程名稱">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：大阪 5 日"
                className={inputClassName}
              />
            </Field>
            <Field label="目的地">
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="搜尋城市或地區"
                className={inputClassName}
              />
            </Field>
            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="出發日">
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className={inputClassName}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="結束日">
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>
            <Field label="邀請同伴">
              <div className="rounded-[13px] border-[1.5px] border-line-strong px-3 py-[10px] text-[13px] leading-[1.5] text-ink-2">
                建立後會產生一組 6 碼邀請碼，分享給另一半，對方在「用邀請碼加入」輸入即可一起編（限兩人）。
              </div>
            </Field>
            {dateWarning && <p className="mb-2 text-[13px] text-warn">{dateWarning}</p>}
            {err && <p className="mb-2 text-[13px] text-danger">{err}</p>}
          </div>
          <div className="px-[22px] pb-[34px] pt-2">
            <Button variant="primary" block disabled={busy} onClick={handleCreate}>
              <Icon name="sparkle" size={18} /> {busy ? '建立中…' : '建立旅程'}
            </Button>
          </div>
        </>
      ) : (
        <div className="px-[22px] pb-[34px] pt-[18px]">
          <p className="mb-4 text-sm leading-[1.5] text-ink-2">
            把這組邀請碼傳給另一半，對方在「用邀請碼加入」輸入後，就能一起編「{created.name}」。
          </p>
          <div className="my-2 mb-5 flex justify-center gap-2">
            {Array.from(created.invite_code ?? '').map((c, i) => (
              <div
                key={i}
                className="num flex h-[52px] w-[42px] items-center justify-center rounded-[13px] bg-primary-soft text-2xl font-extrabold text-primary-deep"
              >
                {c}
              </div>
            ))}
          </div>
          <Button variant="primary" block onClick={onClose}>
            完成
          </Button>
        </div>
      )}
    </Sheet>
  )
}
