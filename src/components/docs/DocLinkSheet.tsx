import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Document } from '../../lib/types'
import {
  linkDocumentToItem,
  linkDocumentToLodging,
  linkDocumentToTransport,
  listDocuments,
  listDocumentsByItem,
  listDocumentsByLodging,
  listDocumentsByTransport,
  unlinkDocumentFromItem,
  unlinkDocumentFromLodging,
  unlinkDocumentFromTransport,
} from '../../lib/documents'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import Sheet from '../ui/Sheet'
import { categoryIcon, categoryLabel } from './docMeta'

interface DocLinkSheetProps {
  tripId: string
  targetKind: 'item' | 'transport' | 'lodging'
  targetId: string
  onChanged: () => void // 連結變動後通知父層重抓已連結清單
  onClose: () => void
}

// 依連結對象抓「已連結文件」（item / transport / lodging 三種多對多表）
function listLinkedByKind(kind: DocLinkSheetProps['targetKind'], targetId: string) {
  if (kind === 'item') return listDocumentsByItem(targetId)
  if (kind === 'transport') return listDocumentsByTransport(targetId)
  return listDocumentsByLodging(targetId)
}

// 連結管理多選器（toggle list）：列出該趟全部文件，逐份開關是否連到此項目/交通。
export default function DocLinkSheet({
  tripId,
  targetKind,
  targetId,
  onChanged,
  onClose,
}: DocLinkSheetProps) {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Document[]>([])
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const all = await listDocuments(tripId)
        const linked = await listLinkedByKind(targetKind, targetId)
        if (!active) return
        setDocs(all)
        setLinkedIds(new Set(linked.map((d) => d.id)))
      } catch (e) {
        if (active) setError(errMessage(e))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [tripId, targetKind, targetId])

  async function toggle(docId: string) {
    const wasLinked = linkedIds.has(docId)
    setBusyId(docId)
    setError(null)
    // 樂觀更新本地集合
    setLinkedIds((prev) => {
      const copy = new Set(prev)
      if (wasLinked) copy.delete(docId)
      else copy.add(docId)
      return copy
    })
    try {
      if (targetKind === 'item') {
        if (wasLinked) await unlinkDocumentFromItem(docId, targetId)
        else await linkDocumentToItem(docId, targetId)
      } else if (targetKind === 'transport') {
        if (wasLinked) await unlinkDocumentFromTransport(docId, targetId)
        else await linkDocumentToTransport(docId, targetId)
      } else {
        if (wasLinked) await unlinkDocumentFromLodging(docId, targetId)
        else await linkDocumentToLodging(docId, targetId)
      }
      onChanged()
    } catch (e) {
      // 失敗復原
      setLinkedIds((prev) => {
        const copy = new Set(prev)
        if (wasLinked) copy.add(docId)
        else copy.delete(docId)
        return copy
      })
      setError(errMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Sheet stacked onClose={onClose}>
      <div className="flex max-h-full flex-col px-[22px] pb-[34px] pt-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">連結文件</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 items-center justify-center text-ink-3"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-[13px] text-ink-3">載入中…</div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Icon name="doc" size={28} className="text-ink-4" />
              <p className="text-[14px] text-ink-3">還沒有文件，先到文件匣上傳。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[9px]">
              {docs.map((d) => {
                const on = linkedIds.has(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => void toggle(d.id)}
                    className="flex items-center gap-[11px] rounded-lg bg-surface p-[10px] text-left shadow-1 active:scale-[0.99] disabled:opacity-60"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-primary-soft text-primary-deep">
                      <Icon name={categoryIcon(d.category)} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold">{d.file_name}</div>
                      <div className="text-[12px] font-semibold text-ink-3">
                        {categoryLabel(d.category)}
                      </div>
                    </div>
                    <span
                      className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] border-2 transition-colors"
                      style={{
                        background: on ? 'var(--primary)' : 'var(--surface)',
                        borderColor: on ? 'var(--primary)' : 'var(--line-strong)',
                        color: '#fff',
                      }}
                    >
                      {on && <Icon name="check" size={15} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onClose()
            navigate(`/trips/${tripId}/docs`)
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface py-[13px] text-[14px] font-bold text-ink shadow-1 active:scale-[0.98]"
        >
          <Icon name="upload" size={16} /> 前往文件匣上傳
        </button>
      </div>
    </Sheet>
  )
}
