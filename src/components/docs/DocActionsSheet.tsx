import { useState } from 'react'
import type { Document, DocumentCategory } from '../../lib/types'
import { openDocument } from '../../lib/documentView'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import { DOC_TABS, categoryLabel } from './docMeta'

interface DocActionsSheetProps {
  doc: Document
  cached: boolean
  canView: boolean // 線上或已快取才可檢視（離線且未快取則禁用）
  linkedCount: number // 連到幾個行程項目/交通
  onToggleCache: (next: boolean) => Promise<void> // true=下載離線，false=移除快取
  onSaveMeta: (patch: { file_name?: string; category?: DocumentCategory }) => Promise<void> // 改名/改分類
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
  onSaveMeta,
  onDelete,
  onClose,
}: DocActionsSheetProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(doc.file_name)

  async function saveName() {
    const next = nameDraft.trim()
    if (!next || next === doc.file_name) {
      setRenaming(false)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSaveMeta({ file_name: next })
      setRenaming(false)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function changeCategory(c: DocumentCategory) {
    if (c === doc.category) return
    setBusy(true)
    setError(null)
    try {
      await onSaveMeta({ category: c })
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleView() {
    if (!doc.storage_path) return // 備忘錄無檔（不會走到此頁）；型別防護
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
      {/* flex + min-h-0：小螢幕（尤其鍵盤彈出）內容超高時動作清單可捲動，「刪除文件」不會捲不到 */}
      <div className="flex min-h-0 flex-col px-[22px] pb-[34px] pt-2">
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

        <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto">
          {/* 重新命名（只改顯示名 file_name，不搬 storage 物件） */}
          {renaming ? (
            <div className="rounded-md border border-line bg-surface p-3 shadow-1">
              <div className="mb-2 text-[13px] font-bold text-ink-2">重新命名</div>
              <input
                autoFocus
                value={nameDraft}
                disabled={busy}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void saveName()
                  } else if (e.key === 'Escape') {
                    setRenaming(false)
                  }
                }}
                className="w-full rounded-md border border-line-strong bg-surface-2 px-3 py-[10px] text-[14.5px] text-ink outline-none focus:border-primary focus:bg-white"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveName()}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary py-[10px] text-[13.5px] font-bold text-white active:scale-[0.98] disabled:opacity-60"
                >
                  <Icon name="check" size={15} /> 儲存
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRenaming(false)}
                  className="flex-1 rounded-md border border-line py-[10px] text-[13.5px] font-bold text-ink-2 active:scale-[0.98] disabled:opacity-60"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setNameDraft(doc.file_name)
                setRenaming(true)
              }}
              className="flex items-center gap-3 rounded-md border border-line bg-surface p-4 text-left shadow-1 active:scale-[0.99] disabled:opacity-60"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
                <Icon name="edit" size={20} />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold">重新命名</div>
                <div className="truncate text-[12.5px] text-ink-3">目前：{doc.file_name}</div>
              </div>
            </button>
          )}

          {/* 變更分類（換 documents.category，連結不受影響） */}
          <div className="rounded-md border border-line bg-surface p-4 shadow-1">
            <div className="mb-[10px] flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
                <Icon name="layers" size={20} />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold">變更分類</div>
                <div className="text-[12.5px] text-ink-3">目前：{categoryLabel(doc.category)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {DOC_TABS.map((t) => {
                const on = doc.category === t.k
                return (
                  <button
                    key={t.k}
                    type="button"
                    disabled={busy || on}
                    onClick={() => void changeCategory(t.k)}
                    className={`inline-flex items-center gap-[6px] rounded-full px-[13px] py-[7px] text-[13px] font-bold transition active:scale-95 disabled:active:scale-100 ${
                      on ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2 disabled:opacity-60'
                    }`}
                  >
                    <Icon name={t.ico} size={14} /> {t.label}
                  </button>
                )
              })}
            </div>
          </div>

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
