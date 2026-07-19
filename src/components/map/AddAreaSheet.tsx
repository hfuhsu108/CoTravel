import { useState } from 'react'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import Field, { inputClassName } from '../ui/Field'
import Icon from '../Icon'
import { errMessage } from '../../lib/errMessage'

interface AddAreaSheetProps {
  onClose: () => void
  onConfirm: (data: { name: string; time_slot: string | null; radius_m: number }) => Promise<void>
}

const SLOTS = ['上午', '下午', '晚上', '全天']

// 圈選區域的設定 sheet（在地圖點完中心後出現）：區域名、時段、半徑。
export default function AddAreaSheet({ onClose, onConfirm }: AddAreaSheetProps) {
  const [name, setName] = useState('')
  const [slot, setSlot] = useState<string | null>(null)
  const [radius, setRadius] = useState(300)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleConfirm() {
    if (!name.trim()) {
      setErr('請輸入區域名稱')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      await onConfirm({ name: name.trim(), time_slot: slot, radius_m: radius })
    } catch (e) {
      setErr(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-[22px] pt-[6px]">
        <h2 className="text-xl font-bold">圈一個區域</h2>
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
        <Field label="區域名稱">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：心齋橋、道頓堀商圈"
            className={inputClassName}
            autoFocus
          />
        </Field>

        <Field label="時段（可選）">
          <div className="flex gap-2">
            {SLOTS.map((s) => {
              const on = slot === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(on ? null : s)}
                  className={`flex-1 rounded-[12px] py-[10px] text-[14px] font-bold transition-colors ${
                    on ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2 border border-line-strong'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label={`範圍半徑：${radius} 公尺`}>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-[color:var(--primary)]"
          />
        </Field>

        {err && <p className="mb-2 text-[13px] text-danger">{err}</p>}

        <Button variant="primary" block disabled={busy} onClick={handleConfirm}>
          <Icon name="layers" size={18} /> {busy ? '建立中…' : '建立區域'}
        </Button>
      </div>
    </Sheet>
  )
}
