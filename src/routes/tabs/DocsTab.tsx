import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { getTripWithMembers } from '../../lib/api'
import {
  listDocuments,
  listDocumentsByTransport,
  listLinkCounts,
  removeDocument,
} from '../../lib/documents'
import { listFlights, removeTransport, type FlightView } from '../../lib/transports'
import { listLodgings, removeLodging } from '../../lib/lodgings'
import { logActivity } from '../../lib/activity'
import { useTripRealtime } from '../../lib/tripRealtime'
import { cacheDocument, openDocument } from '../../lib/documentView'
import { listCachedPaths, removeCached } from '../../lib/offline/docCache'
import { useOnline } from '../../lib/useOnline'
import { errMessage } from '../../lib/errMessage'
import type { Document, DocumentCategory, Lodging, TripMemberWithProfile } from '../../lib/types'
import Icon from '../../components/Icon'
import DocRow from '../../components/docs/DocRow'
import UploadSheet from '../../components/docs/UploadSheet'
import DocActionsSheet from '../../components/docs/DocActionsSheet'
import NoteViewer from '../../components/docs/NoteViewer'
import FlightCard from '../../components/docs/FlightCard'
import FlightFormSheet from '../../components/docs/FlightFormSheet'
import LodgingCard from '../../components/docs/LodgingCard'
import LodgingFormSheet from '../../components/docs/LodgingFormSheet'
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
  const [tripStart, setTripStart] = useState<string | null>(null) // 旅程起訖（航班/住宿日期防呆）
  const [tripEnd, setTripEnd] = useState<string | null>(null)
  const [cachedPaths, setCachedPaths] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<DocumentCategory>('flight')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const online = useOnline()
  const [offlinePreview, setOfflinePreview] = useState(false)
  const effectiveOffline = !online || offlinePreview

  const [uploadOpen, setUploadOpen] = useState(false)
  const [actionDoc, setActionDoc] = useState<Document | null>(null)
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null) // 開啟中的備忘錄（功能 6）

  // 功能 5：航班（機票分頁）
  const [flights, setFlights] = useState<FlightView[]>([])
  const [flightTickets, setFlightTickets] = useState<Map<string, Document | null>>(new Map())
  const [flightFormOpen, setFlightFormOpen] = useState(false)
  const [editingFlight, setEditingFlight] = useState<FlightView | null>(null)

  // 住宿（住宿分頁）
  const [lodgings, setLodgings] = useState<Lodging[]>([])
  const [lodgingFormOpen, setLodgingFormOpen] = useState(false)
  const [editingLodging, setEditingLodging] = useState<Lodging | null>(null)

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
        setTripStart(trip.start_date)
        setTripEnd(trip.end_date)
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

  // 功能 5：載入航班 + 各段連結的機票檔（取第一個檔案型文件當代表）
  const reloadFlights = useCallback(async () => {
    try {
      const fl = await listFlights(tripId)
      setFlights(fl)
      const entries = await Promise.all(
        fl.map(async (f) => {
          try {
            const docs = await listDocumentsByTransport(f.transport.id)
            const ticket = docs.find((d) => d.kind === 'file') ?? docs[0] ?? null
            return [f.transport.id, ticket] as const
          } catch {
            return [f.transport.id, null] as const
          }
        }),
      )
      setFlightTickets(new Map(entries))
    } catch (e) {
      console.warn('[docs] 航班載入失敗', e)
    }
  }, [tripId])

  useEffect(() => {
    void reloadFlights()
  }, [reloadFlights])

  // Realtime：交通變更（對方新增/改/刪航班）→ 重載航班
  const transportsTick = ticks.transports
  const firstTransportsTickRef = useRef(true)
  useEffect(() => {
    if (firstTransportsTickRef.current) {
      firstTransportsTickRef.current = false
      return
    }
    void reloadFlights()
  }, [transportsTick, reloadFlights])

  // 刪除航班：只移除 flight 交通段（起訖機場 point 保留）。throw 交給 FlightCard 顯示。
  async function handleDeleteFlight(flight: FlightView) {
    await removeTransport(flight.transport.id)
    setFlights((prev) => prev.filter((f) => f.transport.id !== flight.transport.id))
    logActivity(
      tripId,
      meId,
      'transport_remove',
      `刪除了航班 ${flight.transport.flight_no ?? ''}`.trim(),
    )
  }

  function handleViewTicket(ticket: Document) {
    if (ticket.kind === 'note') setViewerDoc(ticket)
    else if (ticket.storage_path) void openDocument(ticket.storage_path)
  }

  async function handleFlightSaved() {
    await reloadFlights()
    // 機票檔上傳會新增文件，刷新文件清單與連結數
    try {
      const docs = await listDocuments(tripId)
      setDocuments(docs)
      setLinkCounts(await listLinkCounts(docs.map((d) => d.id)))
    } catch (e) {
      console.warn('[docs] 航班存檔後刷新文件失敗', e)
    }
  }

  // 住宿載入 + 即時刷新（訂房單刪除會把 lodgings.doc_id set null → 觸發 lodgings 事件）
  const reloadLodgings = useCallback(async () => {
    try {
      setLodgings(await listLodgings(tripId))
    } catch (e) {
      console.warn('[docs] 住宿載入失敗', e)
    }
  }, [tripId])

  useEffect(() => {
    void reloadLodgings()
  }, [reloadLodgings])

  const lodgingsTick = ticks.lodgings
  const firstLodgingsTickRef = useRef(true)
  useEffect(() => {
    if (firstLodgingsTickRef.current) {
      firstLodgingsTickRef.current = false
      return
    }
    void reloadLodgings()
  }, [lodgingsTick, reloadLodgings])

  // 刪除住宿：住宿項目經 items.lodging_id cascade 自動清。throw 交給 LodgingCard 顯示。
  async function handleDeleteLodging(lodging: Lodging) {
    await removeLodging(lodging.id)
    setLodgings((prev) => prev.filter((l) => l.id !== lodging.id))
    logActivity(tripId, meId, 'item_remove', `刪除了住宿「${lodging.name}」`)
  }

  async function handleLodgingSaved() {
    await reloadLodgings()
    try {
      const docs = await listDocuments(tripId)
      setDocuments(docs)
      setLinkCounts(await listLinkCounts(docs.map((d) => d.id)))
    } catch (e) {
      console.warn('[docs] 住宿存檔後刷新文件失敗', e)
    }
  }

  const byTab = useMemo(() => documents.filter((d) => d.category === tab), [documents, tab])
  // 離線：已快取的檔案與所有備忘錄（內文隨列載入）在前、未快取檔案灰階在後；線上：全部正常顯示
  const isViewable = (d: Document) => d.kind === 'note' || cachedPaths.has(d.storage_path ?? '')
  const visible = effectiveOffline ? byTab.filter(isViewable) : byTab
  const grayed = effectiveOffline ? byTab.filter((d) => !isViewable(d)) : []

  function openDoc(d: Document) {
    if (d.kind === 'note') setViewerDoc(d)
    else setActionDoc(d)
  }

  function handleUploaded(doc: Document, cached: boolean) {
    setDocuments((prev) => [doc, ...prev])
    if (cached && doc.storage_path) {
      const path = doc.storage_path
      setCachedPaths((prev) => new Set(prev).add(path))
    }
    setTab(doc.category)
    setUploadOpen(false)
    logActivity(
      tripId,
      meId,
      'doc_add',
      doc.kind === 'note' ? `新增了備忘錄「${doc.file_name}」` : `上傳了文件「${doc.file_name}」`,
    )
  }

  // 備忘錄編輯存檔後更新清單與檢視器
  function handleNoteSaved(updated: Document) {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setViewerDoc(updated)
  }

  async function handleToggleCache(doc: Document, next: boolean) {
    // 只有檔案有 storage_path 可快取；備忘錄不會走到這裡
    const path = doc.storage_path
    if (!path) return
    if (next) {
      await cacheDocument(path)
      setCachedPaths((prev) => new Set(prev).add(path))
    } else {
      await removeCached(path)
      setCachedPaths((prev) => {
        const copy = new Set(prev)
        copy.delete(path)
        return copy
      })
    }
  }

  async function handleDelete(doc: Document) {
    await removeDocument(doc)
    if (doc.storage_path) {
      const path = doc.storage_path
      await removeCached(path).catch(() => {})
      setCachedPaths((prev) => {
        const copy = new Set(prev)
        copy.delete(path)
        return copy
      })
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    setActionDoc(null)
    setViewerDoc(null)
    logActivity(
      tripId,
      meId,
      'doc_remove',
      doc.kind === 'note' ? `刪除了備忘錄「${doc.file_name}」` : `刪除了文件「${doc.file_name}」`,
    )
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
    <div className="flex h-full flex-col lg:relative lg:mx-auto lg:w-full lg:max-w-[720px]">
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
        {tab === 'flight' && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-bold">航班</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingFlight(null)
                  setFlightFormOpen(true)
                }}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-[14px] py-2 text-[13px] font-bold text-white active:scale-95"
              >
                <Icon name="plus" size={15} /> 新增航班
              </button>
            </div>
            {flights.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface-2 px-3 py-4 text-center text-[13px] leading-[1.5] text-ink-3">
                尚無航班。點「新增航班」輸入起訖機場與時間，系統會自動建立機場地點、換算時區與飛行時數。
              </p>
            ) : (
              <div className="flex flex-col gap-[11px]">
                {flights.map((f) => (
                  <FlightCard
                    key={f.transport.id}
                    flight={f}
                    ticket={flightTickets.get(f.transport.id) ?? null}
                    tripStart={tripStart}
                    tripEnd={tripEnd}
                    onEdit={() => {
                      setEditingFlight(f)
                      setFlightFormOpen(true)
                    }}
                    onDelete={() => handleDeleteFlight(f)}
                    onViewTicket={() => {
                      const tk = flightTickets.get(f.transport.id)
                      if (tk) handleViewTicket(tk)
                    }}
                  />
                ))}
              </div>
            )}
            {byTab.length > 0 && <h3 className="mb-2 mt-5 text-[15px] font-bold">機票檔案</h3>}
          </div>
        )}

        {tab === 'lodging' && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-bold">住宿</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingLodging(null)
                  setLodgingFormOpen(true)
                }}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-[14px] py-2 text-[13px] font-bold text-white active:scale-95"
              >
                <Icon name="plus" size={15} /> 新增住宿
              </button>
            </div>
            {lodgings.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface-2 px-3 py-4 text-center text-[13px] leading-[1.5] text-ink-3">
                尚無住宿。點「新增住宿」輸入飯店與入住/退房日期，系統會自動在對應日期的頭尾放入飯店。
              </p>
            ) : (
              <div className="flex flex-col gap-[11px]">
                {lodgings.map((l) => (
                  <LodgingCard
                    key={l.id}
                    lodging={l}
                    ticket={l.doc_id ? (documents.find((d) => d.id === l.doc_id) ?? null) : null}
                    tripStart={tripStart}
                    tripEnd={tripEnd}
                    onEdit={() => {
                      setEditingLodging(l)
                      setLodgingFormOpen(true)
                    }}
                    onDelete={() => handleDeleteLodging(l)}
                    onViewTicket={() => {
                      const tk = l.doc_id ? documents.find((d) => d.id === l.doc_id) : null
                      if (tk) handleViewTicket(tk)
                    }}
                  />
                ))}
              </div>
            )}
            {byTab.length > 0 && (
              <h3 className="mb-2 mt-5 text-[15px] font-bold">訂房單與其他文件</h3>
            )}
          </div>
        )}

        {byTab.length === 0 ? (
          tab === 'flight' || tab === 'lodging' ? null : (
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
          )
        ) : (
          <div className="flex flex-col gap-[11px]">
            {visible.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                uploader={members.find((m) => m.user_id === d.uploaded_by)}
                meId={meId}
                cached={cachedPaths.has(d.storage_path ?? '')}
                linkedCount={linkCounts.get(d.id) ?? 0}
                onClick={() => openDoc(d)}
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
                onClick={() => openDoc(d)}
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

      {flightFormOpen && (
        <FlightFormSheet
          tripId={tripId}
          meId={meId}
          flight={editingFlight}
          onClose={() => {
            setFlightFormOpen(false)
            setEditingFlight(null)
          }}
          onSaved={handleFlightSaved}
        />
      )}

      {lodgingFormOpen && (
        <LodgingFormSheet
          tripId={tripId}
          meId={meId}
          lodging={editingLodging}
          onClose={() => {
            setLodgingFormOpen(false)
            setEditingLodging(null)
          }}
          onSaved={handleLodgingSaved}
        />
      )}

      {actionDoc && (
        <DocActionsSheet
          doc={actionDoc}
          cached={cachedPaths.has(actionDoc.storage_path ?? '')}
          canView={online || cachedPaths.has(actionDoc.storage_path ?? '')}
          linkedCount={linkCounts.get(actionDoc.id) ?? 0}
          onToggleCache={(next) => handleToggleCache(actionDoc, next)}
          onDelete={() => handleDelete(actionDoc)}
          onClose={() => setActionDoc(null)}
        />
      )}

      {viewerDoc && (
        <NoteViewer
          doc={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onSaved={handleNoteSaved}
          onDelete={() => handleDelete(viewerDoc)}
        />
      )}
    </div>
  )
}
