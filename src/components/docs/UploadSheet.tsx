import { useRef, useState } from 'react'
import type { Document, DocumentCategory } from '../../lib/types'
import { createNote, uploadDocument } from '../../lib/documents'
import { cacheDocument } from '../../lib/documentView'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import Field, { inputClassName } from '../ui/Field'
import Button from '../ui/Button'
import { DOC_TABS } from './docMeta'

interface UploadSheetProps {
  tripId: string
  defaultCategory: DocumentCategory
  onUploaded: (doc: Document, cached: boolean) => void
  onClose: () => void
}

type Mode = 'file' | 'note'

// 新增文件底部頁：上傳檔案（選檔＋分類＋離線下載）或寫 Markdown 備忘錄（功能 6）。
// 連結行程項目/交通改在各自詳情頁管理（多對多）。
export default function UploadSheet({
  tripId,
  defaultCategory,
  onUploaded,
  onClose,
}: UploadSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
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
      const doc = await uploadDocument({ trip_id: tripId, category, file })
      let cached = false
      if (downloadOffline) {
        // 離線快取失敗不擋上傳（檔案已在雲端）：標記為未快取，使用者可稍後手動下載
        try {
          await cacheDocument(doc.storage_path as string)
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

  async function handleCreateNote() {
    if (!title.trim()) {
      setError('請輸入備忘錄標題')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // 備忘錄內文在 DB，隨列載入即離線可看，不需另存 IndexedDB（cached=false）
      const doc = await createNote({ trip_id: tripId, category, title: title.trim(), content: noteContent })
      onUploaded(doc, false)
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  const submitDisabled = busy || (mode === 'file' ? !file : !title.trim())

  return (
    <Sheet onClose={onClose}>
      <div className="flex max-h-full flex-col px-[22px] pb-[34px] pt-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">新增文件</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 items-center justify-center text-ink-3"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* 模式切換：上傳檔案 / 寫備忘錄 */}
        <div className="mb-4 flex gap-2 rounded-[14px] bg-surface-2 p-1">
          <ModeTab active={mode === 'file'} icon="upload" label="上傳檔案" onClick={() => setMode('file')} />
          <ModeTab active={mode === 'note'} icon="edit" label="寫備忘錄" onClick={() => setMode('note')} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === 'file' ? (
            <>
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
            </>
          ) : (
            <>
              <Field label="標題">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：退稅流程、訂房備註"
                  className={inputClassName}
                />
              </Field>
              <Field label="內容（Markdown）">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={'# 退稅流程\n- 機場 3 樓 G 櫃台\n- **護照**＋登機證\n- [官方說明](https://...)'}
                  rows={9}
                  className="w-full resize-none rounded-lg border border-line bg-surface-2 px-[14px] py-[12px] font-mono text-[14px] leading-[1.6] text-ink outline-none focus:border-primary focus:bg-white"
                />
              </Field>
            </>
          )}

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

          {mode === 'file' && (
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
          )}
        </div>

        {error && (
          <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}

        <div className="pt-3">
          <Button
            variant="primary"
            block
            disabled={submitDisabled}
            onClick={mode === 'file' ? handleUpload : handleCreateNote}
          >
            <Icon name={mode === 'file' ? 'upload' : 'check'} size={18} />
            {busy ? '處理中…' : mode === 'file' ? '上傳' : '儲存備忘錄'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function ModeTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: 'upload' | 'edit'
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-[7px] rounded-[11px] py-[10px] text-[14px] font-bold transition ${
        active ? 'bg-surface text-primary-deep shadow-1' : 'text-ink-3'
      }`}
    >
      <Icon name={icon} size={17} /> {label}
    </button>
  )
}
