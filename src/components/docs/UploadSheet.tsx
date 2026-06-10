import { useRef, useState } from 'react'
import type { Document, DocumentCategory } from '../../lib/types'
import { uploadDocument } from '../../lib/documents'
import { cacheDocument } from '../../lib/documentView'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import Field from '../ui/Field'
import Button from '../ui/Button'
import { DOC_TABS } from './docMeta'

interface UploadSheetProps {
  tripId: string
  defaultCategory: DocumentCategory
  onUploaded: (doc: Document, cached: boolean) => void
  onClose: () => void
}

// 上傳文件底部頁（對照 design_handoff UploadSheet）：選檔 + 分類 + 下載離線。
// 連結行程項目/交通改在各自詳情頁管理（多對多）。
export default function UploadSheet({
  tripId,
  defaultCategory,
  onUploaded,
  onClose,
}: UploadSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory)
  const [downloadOffline, setDownloadOffline] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  async function handleUpload() {
    if (!file) {
      setError('請先選擇檔案')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const doc = await uploadDocument({
        trip_id: tripId,
        category,
        file,
      })
      let cached = false
      if (downloadOffline) {
        // 離線快取失敗不擋上傳（檔案已在雲端）：標記為未快取，使用者可稍後手動下載
        try {
          await cacheDocument(doc.storage_path)
          cached = true
        } catch (e) {
          console.warn('[UploadSheet] 離線快取失敗，文件仍已上傳', e)
        }
      }
      onUploaded(doc, cached)
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex max-h-full flex-col px-[22px] pb-[34px] pt-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">上傳文件</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 items-center justify-center text-ink-3"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="mb-4 flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface-2 px-4 text-center text-ink-3 active:scale-[0.99]"
          >
            <Icon name={file ? 'check' : 'upload'} size={28} />
            <span className="break-all text-[13px] font-semibold">
              {file ? file.name : '拖曳檔案或點擊選取（PDF / 圖片）'}
            </span>
          </button>

          <Field label="選擇分類">
            <div className="flex flex-wrap gap-2">
              {DOC_TABS.map((t) => {
                const on = category === t.k
                return (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setCategory(t.k)}
                    className={`inline-flex items-center gap-[6px] rounded-full px-[14px] py-[9px] text-[13px] font-bold transition ${
                      on ? 'bg-primary text-white' : 'bg-line text-ink-2'
                    }`}
                  >
                    <Icon name={t.ico} size={14} /> {t.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <button
            type="button"
            onClick={() => setDownloadOffline((v) => !v)}
            className="mb-1 flex w-full items-center gap-[10px] py-1 text-left"
          >
            <span
              className="flex h-6 w-6 flex-none items-center justify-center rounded-[8px] border-2 transition-colors"
              style={{
                background: downloadOffline ? 'var(--primary)' : 'var(--surface)',
                borderColor: downloadOffline ? 'var(--primary)' : 'var(--line-strong)',
                color: '#fff',
              }}
            >
              {downloadOffline && <Icon name="check" size={15} />}
            </span>
            <span className="text-[14px] font-semibold">下載供離線使用</span>
          </button>
        </div>

        {error && (
          <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}

        <div className="pt-3">
          <Button variant="primary" block disabled={busy || !file} onClick={handleUpload}>
            <Icon name="upload" size={18} /> {busy ? '上傳中…' : '上傳'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
