import type { ReactNode } from 'react'

// 表單欄位外框（label + 內容），對應 prototype 的 .field。
// 輸入框統一套用 inputClassName（focus 變主色邊框、白底）。
export const inputClassName =
  'w-full rounded-[13px] border-[1.5px] border-line-strong bg-surface-2 px-[14px] py-[14px] font-sans text-[15px] text-ink outline-none transition focus:border-primary focus:bg-white'

export default function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-[15px] flex flex-col gap-[7px]">
      <label className="text-[13px] font-bold text-ink-2">{label}</label>
      {children}
    </div>
  )
}
