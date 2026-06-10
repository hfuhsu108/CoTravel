import { useState } from 'react'
import type { Document } from '../../lib/types'
import { openDocument } from '../../lib/documentView'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import { categoryLabel } from './docMeta'

interface DocActionsSheetProps {
  doc: Document
  cached: boolean
  canView: boolean // 線上或已快取才可檢視（離線且未快取則禁用）
  linkedCount: number // 連到幾個行程項目/交通
  onToggleCache: (next: boolean) => Promise<void> // true=下載離線，false=移除快取
  onDelete: () => Promise<void>
  onClose: () => void
}

// 文件操作底部頁：檢視 / 離線下載開關 / 刪除。對應 design_handoff DocRow 點開後的動作。
export default function DocActionsSheet({
  doc,
  cached,
  canView,
  linkedCount,
  onToggleCache,
  onDelete,
  onClose,
}: DocActionsSheetProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleView() {
    setError(null)
    try {
      await openDocument(doc.storage_path)
    } catch (e) {
      setError(errMessage(e))
    }
  }

  async function handleToggleCache() {
    setBusy(true)
    setError(null)
    try {
      await onToggleCache(!cached)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`確定刪除「${doc.file_name}」？此動作無法復原。`)) return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
      // 成功後由父層關閉並移除列；此處不再操作已卸載狀態
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="px-[22px] pb-[34px] pt-2">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-lg font-bold">{doc.file_name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 flex-none items-center justify-center text-ink-3"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="mb-4 text-[13px] font-semibold text-ink-3">
          {categoryLabel(doc.category)}
          {linkedCount > 0 ? ` · 已連結 ${linkedCount} 處` : ''}
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-[10px]">
          <button
            type="button"
            disabled={!canView}
            onClick={handleView}
            className="flex items-center gap-3 rounded-md border border-line bg-surface p-4 text-left shadow-1 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
              <Icon name="doc" size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-bold">檢視文件</div>
              <div className="text-[12.5px] text-ink-3">
                {canView ? '在新分頁開啟' : '離線且未快取，無法檢視'}
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleToggleCache}
            className="flex items-center gap-3 rounded-md border border-line bg-surface p-4 text-left shadow-1 active:scale-[0.99] disabled:opacity-60"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
              <Icon name={cached ? 'cloudoff' : 'cloud'} size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-bold">{cached ? '移除離線快取' : '下載供離線使用'}</div>
              <div className="text-[12.5px] text-ink-3">
                {cached ? '釋放本機空間，離線將看不到' : '存到本機，落地沒網路也能看'}
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="flex items-center gap-3 rounded-md p-4 text-left text-danger active:scale-[0.99] disabled:opacity-60"
            style={{ background: 'var(--pink-soft)' }}
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-white/70">
              <Icon name="trash" size={18} />
            </span>
            <div>
              <div className="text-[15px] font-bold">刪除文件</div>
              <div className="text-[12.5px] opacity-80">兩人都會看不到，無法復原</div>
            </div>
          </button>
        </div>
      </div>
    </Sheet>
  )
}
