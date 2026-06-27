interface SwitchProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  ariaLabel?: string
}

// 通用開關（iOS 式滑塊）。開＝primary 紫，關＝中性灰；disabled 時淡化。
export default function Switch({ checked, onChange, disabled = false, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-[28px] w-[48px] flex-none items-center rounded-full transition-colors disabled:opacity-40 ${
        checked ? 'bg-primary' : 'bg-line-strong'
      }`}
    >
      <span
        className={`inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-1 transition-transform ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}
