import { useState } from 'react'
import Icon from './Icon'

// 6 碼邀請碼大卡（建立完成、三點選單「顯示邀請碼」共用）。附複製鈕方便分享給夥伴。
export default function InviteCodeCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // 部分瀏覽器/非安全環境無 clipboard 權限：靜默略過，使用者仍可手動讀碼
    }
  }

  if (!code) {
    return <p className="py-3 text-center text-[13px] text-ink-3">這趟旅程沒有邀請碼。</p>
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex justify-center gap-2">
        {Array.from(code).map((c, i) => (
          <div
            key={i}
            className="num flex h-[52px] w-[42px] items-center justify-center rounded-[13px] bg-primary-soft text-2xl font-extrabold text-primary-deep"
          >
            {c}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-[7px] rounded-full bg-line px-4 py-2 text-[13px] font-bold text-ink-2 active:scale-95"
      >
        <Icon name={copied ? 'check' : 'link'} size={15} /> {copied ? '已複製' : '複製邀請碼'}
      </button>
    </div>
  )
}
