import { useState } from 'react'
import { usePwa } from '../lib/pwa/PwaProvider'
import Icon from './Icon'

// 全 App 頂部「有新版」提示條（需求 1）：開啟 App 自動檢查到新版時浮現。
// 沿用 prompt 決策——只提示、不自動重載；點「立即更新」才套用（會重新載入到新版）。
// dismiss 只在本次啟動隱藏；下次開啟若仍有等待中的新版會再次出現。
export default function PwaUpdateBanner() {
  const { needRefresh, applyUpdate } = usePwa()
  const [dismissed, setDismissed] = useState(false)

  if (!needRefresh || dismissed) return null

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] flex items-center gap-3 bg-primary px-4 pb-3 text-white shadow-2"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      role="status"
    >
      <span className="flex-none">
        <Icon name="refresh" size={18} fill />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[13.5px] font-bold">有新版本可用</div>
        <div className="text-[11.5px] font-medium text-white/85">更新以取得最新功能與修正</div>
      </div>
      <button
        type="button"
        onClick={applyUpdate}
        className="flex-none rounded-full bg-white px-[14px] py-[6px] text-[13px] font-bold text-primary-deep active:scale-95"
      >
        立即更新
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="稍後再說"
        className="flex-none text-white/80 active:scale-90"
      >
        <Icon name="x" size={18} />
      </button>
    </div>
  )
}
