import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Item, Transport, TransportMode } from '../../../lib/types'
import { fetchDirections, type DirectionsMode } from '../../../lib/directions'
import { errMessage } from '../../../lib/errMessage'
import Icon from '../../Icon'
import Field, { inputClassName } from '../../ui/Field'
import Button from '../../ui/Button'
import MiniRouteMap from '../MiniRouteMap'
import { DetailHead } from './parts'

// TransitDetail 儲存時往上拋的內容（trip_id/from/to 由 MapTab 補齊）
export interface TransitSavePayload {
  mode: TransportMode
  duration_min?: number | null
  distance_m?: number | null
  custom_label?: string | null
  cost_text?: string | null
  route_polyline?: string | null
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
  const navigate = useNavigate()
  const { tripId = '' } = useParams()

  const [mode, setMode] = useState<TransportMode>(transport?.mode ?? 'walk')
  const [stats, setStats] = useState<RouteStats | null>(statsFromTransport(transport))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 自定義表單（mode=custom 時用；既有為 custom 則帶入）
  const isCustomTransport = transport?.mode === 'custom'
  const [customLabel, setCustomLabel] = useState(isCustomTransport ? (transport?.custom_label ?? '') : '')
  const [durationText, setDurationText] = useState(
    isCustomTransport && transport?.duration_min != null ? String(transport.duration_min) : '',
  )
  const [costText, setCostText] = useState(isCustomTransport ? (transport?.cost_text ?? '') : '')
  const [notes, setNotes] = useState(isCustomTransport ? (transport?.notes ?? '') : '')

  const fromCoord =
    fromItem.lat != null && fromItem.lng != null
      ? { lat: fromItem.lat, lng: fromItem.lng }
      : null
  const toCoord =
    toItem.lat != null && toItem.lng != null ? { lat: toItem.lat, lng: toItem.lng } : null

  // 選 Directions 模式：立即算路線 → 顯示數據 → 成功即 upsert（含 polyline 快取）
  async function selectDirectionsMode(m: DirectionsMode) {
    setMode(m)
    setError(null)
    if (!fromCoord || !toCoord) {
      setError('起點或終點缺少座標，無法計算路線')
      setStats(null)
      return
    }
    if (!routesLib || !geometryLib) {
      setError('地圖服務尚未就緒，請稍候再試')
      return
    }
    setLoading(true)
    setStats(null)
    try {
      const data = await fetchDirections(routesLib, geometryLib, fromCoord, toCoord, m)
      if (!data) {
        setError('找不到這段路線')
        return
      }
      setStats({ duration_min: data.duration_min, distance_m: data.distance_m, cost_text: data.cost_text })
      await onSave({
        mode: m,
        duration_min: data.duration_min,
        distance_m: data.distance_m,
        cost_text: data.cost_text,
        route_polyline: data.encodedPath,
      })
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }

  function selectMode(m: DirectionsMode | 'custom') {
    if (m === 'custom') {
      setMode('custom')
      setError(null)
    } else {
      void selectDirectionsMode(m)
    }
  }

  async function saveCustom() {
    setBusy(true)
    setError(null)
    try {
      const minutes = durationText.trim() ? Number.parseInt(durationText, 10) : null
      await onSave({
        mode: 'custom',
        custom_label: customLabel.trim() || null,
        duration_min: Number.isFinite(minutes) ? minutes : null,
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

  return (
    <div className="absolute inset-0 z-[72] flex flex-col bg-bg animate-slideleft">
      {/* hero：裝飾路線縮圖 + 返回 */}
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
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/trips/${tripId}/docs`)
              }}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface py-[14px] text-base font-bold text-ink shadow-1 active:scale-[0.98]"
            >
              <Icon name="link" size={17} /> 連結車票文件
            </button>
            <Button variant="primary" block disabled={busy || !customLabel.trim()} onClick={saveCustom}>
              <Icon name="check" size={17} /> 儲存
            </Button>
          </div>
        ) : (
          <>
            {/* Directions 數據三欄 */}
            <div className="mb-4 overflow-hidden rounded-lg bg-surface-2 shadow-1">
              {loading ? (
                <div className="py-[26px] text-center text-[13px] text-ink-3">計算路線中…</div>
              ) : stats ? (
                <div className="flex items-stretch justify-around px-2 py-[18px]">
                  <Stat value={String(stats.duration_min)} label="分鐘" />
                  <Divider />
                  <Stat value={km ?? '—'} label="公里" />
                  <Divider />
                  <Stat value={stats.cost_text ?? '—'} label="車資" />
                </div>
              ) : (
                <div className="py-[26px] text-center text-[13px] text-ink-3">
                  尚未計算路線，點上方模式即可匯入
                </div>
              )}
            </div>
          </>
        )}

        {/* 導航 + 移除 */}
        <div className="mt-2 flex flex-col gap-[10px]">
          {fromCoord && toCoord && (
            <Button variant={mode === 'custom' ? 'soft' : 'primary'} block onClick={openNavigation}>
              <Icon name="nav" size={17} /> 開啟路線導航
            </Button>
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
