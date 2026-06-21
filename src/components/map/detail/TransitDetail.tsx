import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Document, Item, TransitStep, Transport, TransportMode } from '../../../lib/types'
import { fetchDirectionsRoutes, type DirectionsMode, type RouteOption } from '../../../lib/directions'
import { uberRideUrl, grabUrl, openExternal } from '../../../lib/deeplinks'
import { listDocumentsByTransport } from '../../../lib/documents'
import { errMessage } from '../../../lib/errMessage'
import Icon from '../../Icon'
import Field, { inputClassName } from '../../ui/Field'
import Button from '../../ui/Button'
import LinkedDocs from '../../docs/LinkedDocs'
import DocLinkSheet from '../../docs/DocLinkSheet'
import FlightSchedule from '../../docs/FlightSchedule'
import MiniRouteMap from '../MiniRouteMap'
import RoutePreviewMap from '../RoutePreviewMap'
import { DetailHead } from './parts'

// TransitDetail 儲存時往上拋的內容（trip_id/from/to 由 MapTab 補齊）
export interface TransitSavePayload {
  mode: TransportMode
  duration_min?: number | null
  distance_m?: number | null
  custom_label?: string | null
  cost_text?: string | null
  route_polyline?: string | null
  steps?: TransitStep[] | null
  notes?: string | null
}

interface TransitDetailProps {
  fromItem: Item
  toItem: Item
  transport: Transport | null // 既有設定（null = 新建）
  onClose: () => void
  onSave: (payload: TransitSavePayload) => Promise<void>
  onRemove: () => Promise<void>
}

// UI 只提供這四種（enum 的 bike 本階段不放）
const MODES: { k: DirectionsMode | 'custom'; t: string }[] = [
  { k: 'walk', t: '步行' },
  { k: 'transit', t: '大眾運輸' },
  { k: 'drive', t: '開車' },
  { k: 'custom', t: '自定義' },
]

// 路線數據三欄顯示用
interface RouteStats {
  duration_min: number
  distance_m: number
  cost_text: string | null
}

function statsFromTransport(t: Transport | null): RouteStats | null {
  if (!t || t.mode === 'custom' || t.duration_min == null) return null
  return { duration_min: t.duration_min, distance_m: t.distance_m ?? 0, cost_text: t.cost_text }
}

export default function TransitDetail({
  fromItem,
  toItem,
  transport,
  onClose,
  onSave,
  onRemove,
}: TransitDetailProps) {
  const routesLib = useMapsLibrary('routes')
  const geometryLib = useMapsLibrary('geometry')
  const { tripId = '' } = useParams()

  const [mode, setMode] = useState<TransportMode>(transport?.mode ?? 'walk')
  const [stats, setStats] = useState<RouteStats | null>(statsFromTransport(transport))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // 功能 2：多路線候選（挑選前）與已選路線的步驟（步行/公車轉乘）
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([])
  const [previewIdx, setPreviewIdx] = useState(0) // 預覽中的路線（挑選前）
  const [chosenSteps, setChosenSteps] = useState<TransitStep[] | null>(
    transport && transport.mode !== 'custom' ? (transport.steps ?? null) : null,
  )
  const [chosenPath, setChosenPath] = useState<string | null>(
    transport && transport.mode !== 'custom' ? (transport.route_polyline ?? null) : null,
  )

  // 自定義表單（mode=custom 時用；既有為 custom 則帶入）
  const isCustomTransport = transport?.mode === 'custom'
  const [customLabel, setCustomLabel] = useState(isCustomTransport ? (transport?.custom_label ?? '') : '')
  const [durationText, setDurationText] = useState(
    isCustomTransport && transport?.duration_min != null ? String(transport.duration_min) : '',
  )
  const [costText, setCostText] = useState(isCustomTransport ? (transport?.cost_text ?? '') : '')
  const [notes, setNotes] = useState(isCustomTransport ? (transport?.notes ?? '') : '')

  // 連結文件（所有交通段皆可連，多對多）：需 transport 已存在（有 id）才能連結
  const [linkedDocs, setLinkedDocs] = useState<Document[]>([])
  const [manageOpen, setManageOpen] = useState(false)

  async function refreshLinked() {
    if (!transport) {
      setLinkedDocs([])
      return
    }
    try {
      setLinkedDocs(await listDocumentsByTransport(transport.id))
    } catch (e) {
      console.warn('[TransitDetail] 連結文件載入失敗', e)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!transport) {
        setLinkedDocs([])
        return
      }
      try {
        const docs = await listDocumentsByTransport(transport.id)
        if (active) setLinkedDocs(docs)
      } catch (e) {
        console.warn('[TransitDetail] 連結文件載入失敗', e)
      }
    })()
    return () => {
      active = false
    }
  }, [transport?.id])

  const fromCoord =
    fromItem.lat != null && fromItem.lng != null
      ? { lat: fromItem.lat, lng: fromItem.lng }
      : null
  const toCoord =
    toItem.lat != null && toItem.lng != null ? { lat: toItem.lat, lng: toItem.lng } : null

  // 選 Directions 模式：列出多條替代路線（功能 2），不自動存，待使用者挑選
  async function fetchRoutes(m: DirectionsMode) {
    setMode(m)
    setError(null)
    setRouteOptions([])
    if (!fromCoord || !toCoord) {
      setError('起點或終點缺少座標，無法計算路線')
      return
    }
    if (!routesLib || !geometryLib) {
      setError('地圖服務尚未就緒，請稍候再試')
      return
    }
    setLoading(true)
    try {
      // 有 place_id 用 placeId（Google 對到正式出入口，修正大型場所形心被導到錯站）
      const origin = fromItem.google_place_id ? { placeId: fromItem.google_place_id } : fromCoord
      const destination = toItem.google_place_id ? { placeId: toItem.google_place_id } : toCoord
      const opts = await fetchDirectionsRoutes(routesLib, geometryLib, origin, destination, m)
      if (opts.length === 0) {
        setError('找不到這段路線')
        return
      }
      setRouteOptions(opts)
      setPreviewIdx(0)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }

  // 挑一條路線：存起來（含步驟）並收起候選清單
  async function pickRoute(opt: RouteOption) {
    setBusy(true)
    setError(null)
    try {
      await onSave({
        mode,
        duration_min: opt.duration_min,
        distance_m: opt.distance_m,
        cost_text: opt.cost_text,
        route_polyline: opt.encodedPath,
        steps: opt.steps,
      })
      setStats({ duration_min: opt.duration_min, distance_m: opt.distance_m, cost_text: opt.cost_text })
      setChosenSteps(opt.steps)
      setChosenPath(opt.encodedPath)
      setRouteOptions([])
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function selectMode(m: DirectionsMode | 'custom') {
    if (m === 'custom') {
      setMode('custom')
      setError(null)
      setRouteOptions([])
    } else {
      void fetchRoutes(m)
    }
  }

  async function saveCustom() {
    setBusy(true)
    setError(null)
    try {
      const minutes = durationText.trim() ? Number.parseInt(durationText, 10) : null
      const manualMin = Number.isFinite(minutes) ? minutes : null
      await onSave({
        mode: 'custom',
        custom_label: customLabel.trim() || null,
        duration_min: manualMin,
        cost_text: costText.trim() || null,
        notes: notes.trim() || null,
        // 自定義無 Directions 路線 → 清掉舊 polyline（地圖改畫虛線直線）
        distance_m: null,
        route_polyline: null,
      })
      onClose()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    try {
      await onRemove()
    } finally {
      setBusy(false)
    }
  }

  // 開啟 Google Maps 路線導航（custom 不帶 travelmode）
  function openNavigation() {
    if (!fromCoord || !toCoord) return
    const tm =
      mode === 'walk' ? 'walking' : mode === 'transit' ? 'transit' : mode === 'drive' ? 'driving' : null
    const params = new URLSearchParams({
      api: '1',
      origin: `${fromCoord.lat},${fromCoord.lng}`,
      destination: `${toCoord.lat},${toCoord.lng}`,
    })
    if (tm) params.set('travelmode', tm)
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  const km = stats ? (stats.distance_m / 1000).toFixed(1) : null

  // 航班段（功能 5）：唯讀，導向文件→機票編輯（避免與機票分頁兩處編輯衝突）
  if (transport?.mode === 'flight') {
    return (
      <div className="absolute inset-0 z-[72] flex flex-col bg-bg animate-slideleft">
        <div className="relative h-[200px] flex-none">
          <MiniRouteMap />
          <button
            type="button"
            onClick={onClose}
            aria-label="返回"
            className="absolute left-[14px] flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/90 text-ink-2 shadow-1 active:scale-95"
            style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
          >
            <Icon name="back" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-[18px]">
          <DetailHead
            title={
              <span className="flex items-center gap-[9px] text-[21px]">
                <span className="min-w-0 truncate">{fromItem.name}</span>
                <span className="flex flex-none text-ink-4">
                  <Icon name="chevR" size={20} />
                </span>
                <span className="min-w-0 truncate">{toItem.name}</span>
              </span>
            }
            badge={
              <span className="inline-flex items-center gap-[6px] rounded-full bg-primary-soft px-[11px] py-[5px] text-[12.5px] font-bold text-primary-deep">
                <Icon name="plane" size={13} /> 航班{transport.flight_no ? ` ${transport.flight_no}` : ''}
              </span>
            }
          />
          {/* 航班時刻（唯讀）：起飛/抵達當地時間、時區、飛行時數、時差。與機票卡共用 FlightSchedule */}
          <div className="mb-3 rounded-lg bg-surface-2 p-4 shadow-1">
            <FlightSchedule transport={transport} fromName={fromItem.name} toName={toItem.name} />
          </div>
          <p className="mb-4 text-center text-[12px] text-ink-3">時間・機票的編輯請至「文件 → 機票」分頁</p>
          <LinkedDocs docs={linkedDocs} onManage={() => setManageOpen(true)} />
          {transport && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md py-[14px] text-base font-bold text-danger active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--pink-soft)' }}
            >
              <Icon name="trash" size={16} /> 移除這段航班
            </button>
          )}
        </div>
        {manageOpen && transport && (
          <DocLinkSheet
            tripId={tripId}
            targetKind="transport"
            targetId={transport.id}
            onChanged={refreshLinked}
            onClose={() => setManageOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[72] flex flex-col bg-bg animate-slideleft">
      {/* hero：真實路線預覽地圖 + 返回（功能 4） */}
      <div className="relative h-[200px] flex-none">
        <RoutePreviewMap
          path={routeOptions.length > 0 ? (routeOptions[previewIdx]?.encodedPath ?? null) : chosenPath}
          from={fromCoord}
          to={toCoord}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="返回"
          className="absolute left-[14px] flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/90 text-ink-2 shadow-1 active:scale-95"
          style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
        >
          <Icon name="back" size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-[18px]">
        <DetailHead
          title={
            <span className="flex items-center gap-[9px] text-[21px]">
              <span className="min-w-0 truncate">{fromItem.name}</span>
              <span className="flex flex-none text-ink-4">
                <Icon name="chevR" size={20} />
              </span>
              <span className="min-w-0 truncate">{toItem.name}</span>
            </span>
          }
          badge={
            <span className="inline-flex items-center gap-[6px] rounded-full bg-primary-soft px-[11px] py-[5px] text-[12.5px] font-bold text-primary-deep">
              <Icon name="nav" size={13} /> 交通
            </span>
          }
        />

        {/* 模式分段切換 */}
        <div className="mb-4 flex gap-1 rounded-[14px] bg-surface-2 p-1">
          {MODES.map((m) => {
            const on = mode === m.k
            return (
              <button
                key={m.k}
                type="button"
                onClick={() => selectMode(m.k)}
                className={`flex-1 rounded-[11px] py-2 text-[13px] font-bold transition ${
                  on ? 'bg-white text-primary-deep shadow-1' : 'text-ink-3'
                }`}
              >
                {m.t}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">{error}</div>
        )}

        {mode === 'custom' ? (
          <div className="animate-fadeup">
            <Field label="交通方式">
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="例如：新幹線、包車、渡輪、租機車"
                className={inputClassName}
              />
            </Field>
            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="預估時間（分鐘）">
                  <input
                    value={durationText}
                    onChange={(e) => setDurationText(e.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    placeholder="25"
                    className={`${inputClassName} num`}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="費用">
                  <input
                    value={costText}
                    onChange={(e) => setCostText(e.target.value)}
                    placeholder="¥240"
                    className={`${inputClassName} num`}
                  />
                </Field>
              </div>
            </div>
            <Field label="備註">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：搭御堂筋線，記得用 ICOCA"
                className={inputClassName}
              />
            </Field>
            <Button variant="primary" block disabled={busy || !customLabel.trim()} onClick={saveCustom}>
              <Icon name="check" size={17} /> 儲存
            </Button>
          </div>
        ) : loading ? (
          <div className="mb-4 rounded-lg bg-surface-2 py-[26px] text-center text-[13px] text-ink-3 shadow-1">
            計算路線中…
          </div>
        ) : routeOptions.length > 0 ? (
          // 多路線候選（功能 2）：挑一條
          <div className="mb-4 flex flex-col gap-2">
            <div className="text-[12.5px] font-bold text-ink-3">
              點卡片在上方地圖預覽，再按「選這條路線」（共 {routeOptions.length} 條）
            </div>
            {routeOptions.map((opt, i) => (
              <RouteOptionCard
                key={i}
                opt={opt}
                selected={i === previewIdx}
                busy={busy}
                onPreview={() => setPreviewIdx(i)}
                onPick={() => void pickRoute(opt)}
              />
            ))}
          </div>
        ) : stats ? (
          // 已選路線：數據三欄 + 步驟（步行/公車轉乘）
          <div className="mb-4">
            <div className="overflow-hidden rounded-lg bg-surface-2 shadow-1">
              <div className="flex items-stretch justify-around px-2 py-[18px]">
                <Stat value={String(stats.duration_min)} label="分鐘" />
                <Divider />
                <Stat value={km ?? '—'} label="公里" />
                <Divider />
                <Stat value={stats.cost_text ?? '—'} label="車資" />
              </div>
            </div>
            {chosenSteps && chosenSteps.length > 0 && <StepList steps={chosenSteps} />}
            {fromCoord && toCoord && (
              <button
                type="button"
                onClick={() => void fetchRoutes(mode as DirectionsMode)}
                className="mt-2 w-full rounded-md border border-line py-[10px] text-[13px] font-bold text-ink-2 active:scale-[0.99]"
              >
                顯示其他路線
              </button>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-lg bg-surface-2 py-[26px] text-center text-[13px] text-ink-3 shadow-1">
            尚未計算路線，點上方模式即可列出路線
          </div>
        )}

        {/* 連結文件（所有交通段皆可；新建未存的段先停用並提示） */}
        <LinkedDocs
          docs={linkedDocs}
          onManage={() => setManageOpen(true)}
          disabledReason={transport ? undefined : '先設定此段交通後即可連結文件'}
        />

        {/* 導航 + 移除 */}
        <div className="mt-2 flex flex-col gap-[10px]">
          {fromCoord && toCoord && (
            <Button variant={mode === 'custom' ? 'soft' : 'primary'} block onClick={openNavigation}>
              <Icon name="nav" size={17} /> 開啟路線導航
            </Button>
          )}

          {/* 叫車 deep link（功能 13）：帶目的地座標跳轉外部平台（無下單 API） */}
          {toCoord && (
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-3">叫車</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openExternal(uberRideUrl(toCoord.lat, toCoord.lng, toItem.name))}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[12px] text-[14px] font-bold text-primary-deep active:scale-[0.98]"
                >
                  <Icon name="car" size={16} /> Uber
                </button>
                <button
                  type="button"
                  onClick={() => openExternal(grabUrl())}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[12px] text-[14px] font-bold text-primary-deep active:scale-[0.98]"
                >
                  <Icon name="car" size={16} /> Grab
                </button>
              </div>
            </div>
          )}

          {transport && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="flex w-full items-center justify-center gap-2 rounded-md py-[14px] text-base font-bold text-danger active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--pink-soft)' }}
            >
              <Icon name="trash" size={16} /> 移除這段交通
            </button>
          )}
        </div>
      </div>

      {manageOpen && transport && (
        <DocLinkSheet
          tripId={tripId}
          targetKind="transport"
          targetId={transport.id}
          onChanged={refreshLinked}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="num text-[26px] font-extrabold leading-none text-primary-deep">{value}</div>
      <div className="mt-1 text-xs font-bold text-ink-3">{label}</div>
    </div>
  )
}

function Divider() {
  return <div className="w-px self-stretch bg-line" />
}

// 單一步驟文字：步行→「步行 N 分」；開車→「開車 N 分」；搭乘→「公車 87」等
function stepLabel(s: TransitStep): string {
  if (s.mode === 'walk') return `步行 ${s.duration_min} 分`
  if (s.mode === 'drive') return `開車 ${s.duration_min} 分`
  const v = s.vehicle ?? '搭乘'
  const line = s.line ? ` ${s.line}` : ''
  const stops = s.num_stops != null ? `（${s.num_stops} 站）` : ''
  return `${v}${line}${stops}`
}

function RouteOptionCard({
  opt,
  selected,
  busy,
  onPreview,
  onPick,
}: {
  opt: RouteOption
  selected: boolean
  busy: boolean
  onPreview: () => void
  onPick: () => void
}) {
  const km = (opt.distance_m / 1000).toFixed(1)
  return (
    <div
      className={`rounded-lg border bg-surface p-3 shadow-1 ${selected ? 'border-primary' : 'border-line'}`}
    >
      <button type="button" onClick={onPreview} className="w-full text-left">
        <div className="flex items-center justify-between">
          <span className="num text-[17px] font-extrabold text-primary-deep">
            {opt.duration_min} 分
          </span>
          <span className="num text-[12.5px] font-bold text-ink-3">
            {km} 公里
            {opt.cost_text ? ` · ${opt.cost_text}` : ''}
            {opt.transfers > 0 ? ` · 轉乘 ${opt.transfers} 次` : ''}
          </span>
        </div>
        <div className="mt-[6px] truncate text-[12.5px] text-ink-2">
          {opt.steps.map(stepLabel).join(' → ')}
        </div>
      </button>
      {selected && (
        <button
          type="button"
          disabled={busy}
          onClick={onPick}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-primary py-[9px] text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
        >
          <Icon name="check" size={15} /> 選這條路線
        </button>
      )}
    </div>
  )
}

function StepList({ steps }: { steps: TransitStep[] }) {
  return (
    <div className="mt-3 flex flex-col gap-[10px] rounded-lg bg-surface-2 p-3 shadow-1">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-2 text-[13px]">
          <Icon
            name={s.mode === 'walk' ? 'walk' : 'train'}
            size={16}
            className="mt-[1px] flex-none text-primary-deep"
          />
          <div className="min-w-0">
            <div className="font-bold text-ink-2">{stepLabel(s)}</div>
            {s.mode === 'transit' && s.from && s.to && (
              <div className="text-[12px] text-ink-3">
                {s.from} → {s.to}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
