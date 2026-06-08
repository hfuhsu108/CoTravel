import type { ButtonHTMLAttributes, ReactNode } from 'react'

// 共用按鈕，變體對應 prototype 的 .btn 系列（primary/ghost/soft/dark/plain）。
type Variant = 'primary' | 'ghost' | 'soft' | 'dark' | 'plain'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-[9px] whitespace-nowrap rounded-md px-5 py-[15px] font-sans text-base font-bold transition active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-[0_6px_16px_rgba(122,108,240,0.35)] active:bg-primary-deep',
  ghost: 'bg-surface text-ink border border-line shadow-1',
  soft: 'bg-primary-soft text-primary-deep',
  dark: 'bg-ink text-white',
  plain: 'bg-transparent text-ink-3',
}

export default function Button({
  variant = 'primary',
  block = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
