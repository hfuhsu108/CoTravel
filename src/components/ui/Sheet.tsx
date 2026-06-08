import { useEffect, type ReactNode } from 'react'

// 由下滑入的底部 sheet（scrim + 圓角頂 + 把手），對應 prototype 的 .scrim/.sheet/.grip。
// 以 absolute 定位於最近的 relative 祖先（App 外殼），故須在外殼容器內渲染。
interface SheetProps {
  onClose: () => void
  children: ReactNode
  className?: string
}

export default function Sheet({ onClose, children, className = '' }: SheetProps) {
  // Esc 關閉（鍵盤可用性）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div
        className="absolute inset-0 z-[70] animate-fade bg-[rgba(28,20,52,0.42)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 z-[71] flex max-h-[92%] flex-col rounded-t-[28px] bg-surface shadow-3 animate-slideup ${className}`}
      >
        <div className="mx-auto mb-1 mt-[11px] h-[5px] w-[42px] flex-none rounded-full bg-line-strong" />
        {children}
      </div>
    </>
  )
}
