import { useEffect, useState } from 'react'
import type { Document, Lodging } from '../../lib/types'
import { listDocumentsByLodging } from '../../lib/documents'
import { isDateOutsideTrip } from '../../lib/scheduleWarnings'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'
import LinkedDocs from './LinkedDocs'
import DocLinkSheet from './DocLinkSheet'

interface LodgingCardProps {
  tripId: string
  lodging: Lodging
  tripStart: string | null // 旅程起訖（日期防呆）
  tripEnd: string | null
  onEdit: () => void
  onDelete: () => Promise<void>
  onLinksChanged?: () => void // 連結變動後通知父層刷新文件連結數
}

// 'YYYY-MM-DD' → 'M/D'
function fmtDate(s: string): string {
  const p = s.split('-')
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : s
}

function nights(ci: string, co: string): number {
  const a = new Date(`${ci}T00:00:00`)
  const b = new Date(`${co}T00:00:00`)
  const n = Math.round((b.getTime() - a.getTime()) / 86_400_000)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// 住宿摘要卡（比照航班卡）：飯店名、入住→退房、晚數、備註、連結文件（可多份、與行程住宿項目共用）、編輯/刪除。
export default function LodgingCard({
  tripId,
  lodging,
  tripStart,
  tripEnd,
  onEdit,
  onDelete,
  onLinksChanged,
}: LodgingCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedDocs, setLinkedDocs] = useState<Document[]>([])
  const [manageOpen, setManageOpen] = useState(false)
  const n = nights(lodging.check_in, lodging.check_out)
  const dateOutside =
    isDateOutsideTrip(lodging.check_in, tripStart, tripEnd) ||
    isDateOutsideTrip(lodging.check_out, tripStart, tripEnd)

  // 連結文件變動（管理後）重抓，並通知父層刷新文件清單的連結數
  async function refreshLinked() {
    try {
      setLinkedDocs(await listDocumentsByLodging(lodging.id))
      onLinksChanged?.()
    } catch (e) {
      console.warn('[LodgingCard] 連結文件載入失敗', e)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const docs = await listDocumentsByLodging(lodging.id)
        if (active) setLinkedDocs(docs)
      } catch (e) {
        console.warn('[LodgingCard] 連結文件載入失敗', e)
      }
    })()
    return () => {
      active = false
    }
  }, [lodging.id])

  async function handleDelete() {
    if (
      !window.confirm(`確定刪除住宿「${lodging.name}」？會移除行程上的住宿項目（訂房單檔保留）。`)
    )
      return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg bg-surface p-4 shadow-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-[10px]">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
            <Icon name="bed" size={20} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold">{lodging.name}</div>
            <div className="mt-[2px] flex items-center gap-[6px] text-[13px] font-bold text-ink-2">
              <span className="num">{fmtDate(lodging.check_in)}</span>
              <Icon name="chevR" size={13} className="text-ink-3" />
              <span className="num">{fmtDate(lodging.check_out)}</span>
              {n > 0 && <span className="num font-semibold text-ink-3">· {n} 晚</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={onEdit}
            aria-label="編輯住宿"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-3 active:scale-90 disabled:opacity-50"
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            aria-label="刪除住宿"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-3 active:scale-90 disabled:opacity-50"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>

      {lodging.notes && (
        <div className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-[1.5] text-ink-2">
          {lodging.notes}
        </div>
      )}

      {dateOutside && (
        <div className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-[12.5px] font-semibold text-[#b9762a]">
          住宿日期不在旅程日期範圍內
        </div>
      )}

      {/* 連結文件（訂房單等，可多份）；行程的住宿項目以 lodging 動態共用同一份清單 */}
      <LinkedDocs docs={linkedDocs} onManage={() => setManageOpen(true)} />

      {error && (
        <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[12.5px] text-[#b9762a]">{error}</div>
      )}

      {manageOpen && (
        <DocLinkSheet
          tripId={tripId}
          targetKind="lodging"
          targetId={lodging.id}
          onChanged={refreshLinked}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  )
}
