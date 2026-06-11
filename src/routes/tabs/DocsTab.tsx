import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { getTripWithMembers } from '../../lib/api'
import { listDocuments, listLinkCounts, removeDocument } from '../../lib/documents'
import { logActivity } from '../../lib/activity'
import { useTripRealtime } from '../../lib/tripRealtime'
import { cacheDocument } from '../../lib/documentView'
import { listCachedPaths, removeCached } from '../../lib/offline/docCache'
import { useOnline } from '../../lib/useOnline'
import { errMessage } from '../../lib/errMessage'
import type { Document, DocumentCategory, TripMemberWithProfile } from '../../lib/types'
import Icon from '../../components/Icon'
import DocRow from '../../components/docs/DocRow'
import UploadSheet from '../../components/docs/UploadSheet'
import DocActionsSheet from '../../components/docs/DocActionsSheet'
import { DOC_TABS } from '../../components/docs/docMeta'

// 畫面 4 文件匣：四分類上傳/瀏覽 + 離線快取（IndexedDB）。連結在行程/交通詳情頁管理（多對多）。
export default function DocsTab() {
  const { tripId = '' } = useParams()
  const { user } = useAuth()
  const meId = user?.id ?? ''
  const { ticks } = useTripRealtime()

  const [documents, setDocuments] = useState<Document[]>([])
  const [linkCounts, setLinkCounts] = useState<Map<string, number>>(new Map())
  const [members, setMembers] = useState<TripMemberWithProfile[]>([])
  const [cachedPaths, setCachedPaths] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<DocumentCategory>('flight')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const online = useOnline()
  const [offlinePreview, setOfflinePreview] = useState(false)
  const effectiveOffline = !online || offlinePreview

  const [uploadOpen, setUploadOpen] = useState(false)
  const [actionDoc, setActionDoc] = useState<Document | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [trip, docs, cached] = await Promise.all([
          getTripWithMembers(tripId),
          listDocuments(tripId),
          listCachedPaths(),
        ])
        if (!trip) throw new Error('找不到這趟旅程，或你不是成員')
        const counts = await listLinkCounts(docs.map((d) => d.id))
        if (!active) return
        setMembers(trip.members)
        setDocuments(docs)
        setLinkCounts(counts)
        setCachedPaths(new Set(cached))
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
  }, [tripId])

  // Realtime：documents 變更（多半是對方上傳/刪除）→ 靜默 refetch，不閃 loading。
  // cachedPaths 是本機 IndexedDB 狀態，與遠端變更無關、不重讀。
  const docsTick = ticks.documents
  const firstDocsTickRef = useRef(true)
  useEffect(() => {
    if (firstDocsTickRef.current) {
      firstDocsTickRef.current = false
      return
    }
    let active = true
    async function reload() {
      try {
        const docs = await listDocuments(tripId)
        const counts = await listLinkCounts(docs.map((d) => d.id))
        if (!active) return
        setDocuments(docs)
        setLinkCounts(counts)
      } catch (e) {
        console.warn('[docs] 即時刷新失敗', e)
      }
    }
    void reload()
    return () => {
      active = false
    }
  }, [docsTick, tripId])

  const byTab = useMemo(() => documents.filter((d) => d.category === tab), [documents, tab])
  // 離線：已快取在前、未快取灰階在後；線上：全部正常顯示
  const visible = effectiveOffline ? byTab.filter((d) => cachedPaths.has(d.storage_path)) : byTab
  const grayed = effectiveOffline ? byTab.filter((d) => !cachedPaths.has(d.storage_path)) : []

  function handleUploaded(doc: Document, cached: boolean) {
    setDocuments((prev) => [doc, ...prev])
    if (cached) setCachedPaths((prev) => new Set(prev).add(doc.storage_path))
    setTab(doc.category)
    setUploadOpen(false)
    logActivity(tripId, meId, 'doc_add', `上傳了文件「${doc.file_name}」`)
  }

  async function handleToggleCache(doc: Document, next: boolean) {
    if (next) {
      await cacheDocument(doc.storage_path)
      setCachedPaths((prev) => new Set(prev).add(doc.storage_path))
    } else {
      await removeCached(doc.storage_path)
      setCachedPaths((prev) => {
        const copy = new Set(prev)
        copy.delete(doc.storage_path)
        return copy
      })
    }
  }

  async function handleDelete(doc: Document) {
    await removeDocument(doc)
    await removeCached(doc.storage_path).catch(() => {})
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    setCachedPaths((prev) => {
      const copy = new Set(prev)
      copy.delete(doc.storage_path)
      return copy
    })
    setActionDoc(null)
    logActivity(tripId, meId, 'doc_remove', `刪除了文件「${doc.file_name}」`)
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-ink-3">載入中…</div>
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-sm text-danger">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* appbar：標題 + 離線狀態鈕（線上可手動切預覽；真離線時鎖定） */}
      <div className="flex flex-none items-center justify-between px-4 pb-2 pt-3">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">文件匣</h1>
        <button
          type="button"
          disabled={!online}
          onClick={() => setOfflinePreview((v) => !v)}
          title="離線模式"
          className="inline-flex items-center gap-[7px] rounded-[13px] border px-3 py-2 text-[12.5px] font-bold disabled:opacity-90"
          style={
            effectiveOffline
              ? { color: '#b9762a', background: 'var(--warn-soft)', borderColor: '#f3dcc0' }
              : { color: 'var(--ink-2)', background: 'var(--surface)', borderColor: 'var(--line)' }
          }
        >
          <Icon name={effectiveOffline ? 'cloudoff' : 'cloud'} size={18} />
          <span className="whitespace-nowrap">{effectiveOffline ? '離線中' : '線上'}</span>
        </button>
      </div>

      {/* 四分類頁籤（含計數） */}
      <div className="flex flex-none gap-[7px] overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {DOC_TABS.map((t) => {
          const on = tab === t.k
          const n = documents.filter((d) => d.category === t.k).length
          return (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={`inline-flex flex-none items-center gap-[7px] rounded-[13px] px-[14px] py-[9px] text-[13.5px] font-bold shadow-1 transition ${
                on ? 'bg-primary text-white' : 'bg-surface text-ink-2'
              }`}
            >
              <Icon name={t.ico} size={16} /> {t.label}
              <span
                className={`num rounded-full px-[6px] py-px text-[11px] ${
                  on ? 'bg-white/25' : 'bg-line'
                }`}
              >
                {n}
              </span>
            </button>
          )
        })}
      </div>

      {effectiveOffline && (
        <div className="flex-none px-4 pb-[10px]">
          <span className="inline-flex items-center gap-[6px] rounded-full bg-warn-soft px-[11px] py-[5px] text-[12.5px] font-bold text-[#b9762a]">
            <Icon name="cloudoff" size={13} /> 離線模式：僅可開啟已快取文件
          </span>
        </div>
      )}

      {/* 清單 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[110px]">
        {byTab.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <div className="ph flex h-24 w-[120px] items-center justify-center rounded-lg">
              <span className="ph-label">空狀態</span>
            </div>
            <h3 className="mt-2 text-[17px] font-bold">這個分類還沒有文件</h3>
            <p className="text-[14px] leading-[1.5] text-ink-3">
              上傳機票、訂房單或證件影本，
              <br />
              出國時一鍵就能找到。
            </p>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary-soft px-5 py-[13px] font-bold text-primary-deep active:scale-[0.98]"
            >
              <Icon name="upload" size={17} /> 上傳文件
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[11px]">
            {visible.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                uploader={members.find((m) => m.user_id === d.uploaded_by)}
                meId={meId}
                cached={cachedPaths.has(d.storage_path)}
                linkedCount={linkCounts.get(d.id) ?? 0}
                onClick={() => setActionDoc(d)}
              />
            ))}
            {grayed.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                uploader={members.find((m) => m.user_id === d.uploaded_by)}
                meId={meId}
                cached={false}
                linkedCount={linkCounts.get(d.id) ?? 0}
                disabled
                onClick={() => setActionDoc(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 右下上傳 FAB */}
      <button
        type="button"
        onClick={() => setUploadOpen(true)}
        aria-label="上傳文件"
        className="absolute bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-3 active:scale-95"
      >
        <Icon name="upload" size={24} />
      </button>

      {uploadOpen && (
        <UploadSheet
          tripId={tripId}
          defaultCategory={tab}
          onUploaded={handleUploaded}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {actionDoc && (
        <DocActionsSheet
          doc={actionDoc}
          cached={cachedPaths.has(actionDoc.storage_path)}
          canView={online || cachedPaths.has(actionDoc.storage_path)}
          linkedCount={linkCounts.get(actionDoc.id) ?? 0}
          onToggleCache={(next) => handleToggleCache(actionDoc, next)}
          onDelete={() => handleDelete(actionDoc)}
          onClose={() => setActionDoc(null)}
        />
      )}
    </div>
  )
}
