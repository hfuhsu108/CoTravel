import { useEffect, type ReactNode } from 'react'

// 由下滑入的底部 sheet（scrim + 圓角頂 + 把手），對應 prototype 的 .scrim/.sheet/.grip。
// 以 absolute 定位於最近的 relative 祖先（App 外殼），故須在外殼容器內渲染。
interface SheetProps {
  onClose: () => void
  children: ReactNode
  className?: string
  // 疊在詳情全頁浮層（z-[72]）之上時設 true，用更高 z 避免被遮
  stacked?: boolean
}

export default function Sheet({ onClose, children, className = '', stacked = false }: SheetProps) {
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
      {/* scrim 用 fixed 蓋滿視窗（含底部分頁列）：sheet 開啟時誤觸 nav 切路由會丟表單。
          dialog 仍 absolute 定位於 relative 祖先，位置不變。 */}
      <div
        className={`fixed inset-0 animate-fade bg-[rgba(28,20,52,0.42)] ${stacked ? 'z-[80]' : 'z-[70]'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col rounded-t-[28px] bg-surface shadow-3 animate-slideup ${stacked ? 'z-[81]' : 'z-[71]'} ${className}`}
      >
        <div className="mx-auto mb-1 mt-[11px] h-[5px] w-[42px] flex-none rounded-full bg-line-strong" />
        {children}
      </div>
    </>
  )
}
