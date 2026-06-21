import type { ChangeEvent } from 'react'

interface Time24FieldProps {
  value: string // 'HH:MM' 或 ''
  onChange: (v: string) => void // 即時：已插冒號的顯示值
  onCommit?: (v: string) => void // blur：正規化後的合法值（'HH:MM' 或 ''）
  disabled?: boolean
  className?: string
  placeholder?: string
  ariaLabel?: string
}

// 打字時：尊重使用者輸入的冒號（以它切「時:分」，避免 8→按冒號→'84'→誤判成 23:00）；
// 無冒號則「滿 2 位自動補冒號」，且第一碼 >2 不可能是「時的十位」→ 視為 0X 時、自動跳到分。
function formatTyping(raw: string): string {
  const colon = raw.indexOf(':')
  if (colon >= 0) {
    const h = raw.slice(0, colon).replace(/\D/g, '').slice(0, 2)
    const m = raw.slice(colon + 1).replace(/\D/g, '').slice(0, 2)
    return `${h}:${m}`
  }
  let d = raw.replace(/\D/g, '').slice(0, 4)
  if (d.length === 1 && Number(d) > 2) d = `0${d}`
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}

// blur 正規化為合法 24h 'HH:MM'（時 0–23、分 0–59、補零）；空白回 ''。同樣尊重冒號。
function normalize(v: string): string {
  if (!v.replace(/\D/g, '')) return ''
  let hPart: string
  let mPart: string
  const colon = v.indexOf(':')
  if (colon >= 0) {
    hPart = v.slice(0, colon).replace(/\D/g, '') || '0'
    mPart = v.slice(colon + 1).replace(/\D/g, '') || '0'
  } else {
    const d = v.replace(/\D/g, '').slice(0, 4)
    hPart = d.length <= 2 ? d : d.slice(0, 2)
    mPart = d.length <= 2 ? '0' : d.slice(2)
  }
  const h = Math.min(23, Number.parseInt(hPart, 10) || 0)
  const m = Math.min(59, Number.parseInt(mPart, 10) || 0)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 受控 24 小時制時間輸入（功能 4）。用純文字 HH:MM 取代原生 time/datetime-local——
// 後者的時制跟著瀏覽器/OS locale（zh-Hant Chromium 會顯示「上午/下午」12 小時制），
// HTML 屬性管不動；自製受控元件才能保證任何裝置都是 24 小時制。
export default function Time24Field({
  value,
  onChange,
  onCommit,
  disabled,
  className,
  placeholder = '--:--',
  ariaLabel,
}: Time24FieldProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(formatTyping(e.target.value))
  }
  function handleBlur() {
    const n = normalize(value)
    if (n !== value) onChange(n)
    onCommit?.(n)
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={5}
      aria-label={ariaLabel}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  )
}
