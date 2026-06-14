import { useState } from 'react'
import type { Document } from '../../lib/types'
import { openDocument } from '../../lib/documentView'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import NoteViewer from './NoteViewer'
import { categoryIcon, categoryLabel } from './docMeta'

interface LinkedDocsProps {
  docs: Document[]
  onManage: () => void
  // 交通段尚未存檔等情況：顯示提示、停用管理
  disabledReason?: string
}

// 詳情頁「已連結文件」：預設只列已連結（可折疊）＋「管理」鈕開 toggle 多選器。
export default function LinkedDocs({ docs, onManage, disabledReason }: LinkedDocsProps) {
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewNote, setViewNote] = useState<Document | null>(null) // 檢視中的 Markdown 備忘錄（功能 7）

  async function view(path: string) {
    setError(null)
    try {
      await openDocument(path)
    } catch (e) {
      setError(errMessage(e))
    }
  }

  return (
    <div className="my-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-[6px] font-round text-xs font-bold uppercase tracking-[0.14em] text-ink-3"
        >
          <Icon name={open ? 'chevD' : 'chevR'} size={15} />
          連結文件（{docs.length}）
        </button>
        <button
          type="button"
          disabled={!!disabledReason}
          onClick={onManage}
          className="inline-flex items-center gap-[5px] rounded-full bg-primary-soft px-[11px] py-[5px] text-[12.5px] font-bold text-primary-deep active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          <Icon name="link" size={13} /> 管理
        </button>
      </div>

      {disabledReason ? (
        <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-3 text-[13px] text-ink-3">
          {disabledReason}
        </p>
      ) : (
        open && (
          <div className="mt-2 flex flex-col gap-[9px]">
            {docs.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface-2 px-3 py-3 text-[13px] text-ink-3">
                還沒有連結文件，點「管理」加入。
              </p>
            ) : (
              docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-[11px] rounded-lg bg-surface p-[10px] shadow-1"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-primary-soft text-primary-deep">
                    <Icon name={d.kind === 'note' ? 'edit' : categoryIcon(d.category)} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{d.file_name}</div>
                    <div className="text-[12px] font-semibold text-ink-3">
                      {categoryLabel(d.category)}
                      {d.kind === 'note' ? ' · 備忘錄' : ''}
                    </div>
                  </div>
                  {/* 備忘錄開內建檢視器（功能 7）；檔案開連結 */}
                  {d.kind === 'note' ? (
                    <button
                      type="button"
                      onClick={() => setViewNote(d)}
                      className="flex flex-none items-center gap-1 rounded-md bg-primary-soft px-3 py-[8px] text-[13px] font-bold text-primary-deep active:scale-95"
                    >
                      <Icon name="doc" size={15} /> 檢視
                    </button>
                  ) : (
                    d.storage_path && (
                      <button
                        type="button"
                        onClick={() => void view(d.storage_path as string)}
                        className="flex flex-none items-center gap-1 rounded-md bg-primary-soft px-3 py-[8px] text-[13px] font-bold text-primary-deep active:scale-95"
                      >
                        <Icon name="doc" size={15} /> 檢視
                      </button>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        )
      )}

      {error && (
        <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
          {error}
        </div>
      )}

      {/* 備忘錄唯讀檢視（無 onSaved/onDelete）；巢狀於詳情浮層內，自然疊在其上 */}
      {viewNote && <NoteViewer doc={viewNote} onClose={() => setViewNote(null)} />}
    </div>
  )
}
