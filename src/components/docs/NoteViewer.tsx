import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Document } from '../../lib/types'
import { updateNote } from '../../lib/documents'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import { inputClassName } from '../ui/Field'
import { categoryLabel } from './docMeta'

interface NoteViewerProps {
  doc: Document
  onClose: () => void
  onSaved?: (doc: Document) => void // 省略＝純檢視（不顯示編輯）
  onDelete?: () => Promise<void> // 省略＝純檢視（不顯示刪除）
}

// 備忘錄檢視/編輯（功能 6）：react-markdown + remark-gfm 渲染（不開放 raw HTML，防 XSS）。
// 不開放 raw HTML：react-markdown 預設即安全（無 rehype-raw），使用者自寫筆記仍以純 Markdown 處理。
const proseClass =
  'text-[14.5px] leading-[1.65] text-ink-2 ' +
  '[&_h1]:mt-3 [&_h1]:text-[19px] [&_h1]:font-bold [&_h1]:text-ink ' +
  '[&_h2]:mt-3 [&_h2]:text-[16.5px] [&_h2]:font-bold [&_h2]:text-ink ' +
  '[&_h3]:mt-2 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-ink ' +
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 ' +
  '[&_a]:font-semibold [&_a]:text-primary-deep [&_a]:underline ' +
  '[&_code]:rounded [&_code]:bg-line [&_code]:px-1 [&_code]:py-[1px] [&_code]:text-[13px] ' +
  '[&_strong]:font-bold [&_strong]:text-ink ' +
  '[&_blockquote]:my-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-ink-3 ' +
  '[&_hr]:my-3 [&_hr]:border-line [&_table]:my-2 [&_th]:border [&_th]:border-line [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1'

export default function NoteViewer({ doc, onClose, onSaved, onDelete }: NoteViewerProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [title, setTitle] = useState(doc.file_name)
  const [content, setContent] = useState(doc.content ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) {
      setError('請輸入標題')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await updateNote(doc.id, { title: title.trim(), content })
      onSaved?.(updated)
      setMode('view')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`確定刪除備忘錄「${doc.file_name}」？此動作無法復原。`)) return
    setBusy(true)
    setError(null)
    try {
      await onDelete?.()
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex min-h-0 flex-col px-[22px] pb-[30px] pt-2">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-bold">
              {mode === 'edit' ? '編輯備忘錄' : doc.file_name}
            </h2>
            <div className="mt-[2px] text-[12.5px] font-semibold text-ink-3">
              {categoryLabel(doc.category)} · 備忘錄
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 flex-none items-center justify-center text-ink-3"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}

        {mode === 'view' ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto pb-2">
              {doc.content && doc.content.trim() ? (
                <div className={proseClass}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="py-6 text-center text-[13px] text-ink-3">（空白備忘錄）</p>
              )}
            </div>
            {(onSaved || onDelete) && (
              <div className="flex gap-2 pt-3">
                {onSaved && (
                  <Button variant="primary" block onClick={() => setMode('edit')}>
                    <Icon name="edit" size={17} /> 編輯
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="soft"
                    disabled={busy}
                    onClick={handleDelete}
                    className="!bg-pink-soft !text-danger"
                  >
                    <Icon name="trash" size={17} /> 刪除
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <input
                value={title}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="標題"
                className={`${inputClassName} mb-3`}
              />
              <textarea
                value={content}
                disabled={busy}
                onChange={(e) => setContent(e.target.value)}
                placeholder={'用 Markdown 寫，例如：\n# 退稅流程\n- 機場 3 樓 G 櫃台\n- **護照**＋登機證'}
                rows={12}
                className="w-full resize-none rounded-lg border border-line bg-surface-2 px-[14px] py-[12px] font-mono text-[14px] leading-[1.6] text-ink outline-none focus:border-primary focus:bg-white"
              />
              <p className="mt-2 text-[12px] text-ink-3">支援 Markdown：# 標題、- 清單、**粗體**、[連結]()。</p>
            </div>
            <div className="flex gap-2 pt-3">
              <Button variant="primary" block disabled={busy} onClick={handleSave}>
                <Icon name="check" size={17} /> {busy ? '儲存中…' : '儲存'}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setTitle(doc.file_name)
                  setContent(doc.content ?? '')
                  setMode('view')
                  setError(null)
                }}
              >
                取消
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
