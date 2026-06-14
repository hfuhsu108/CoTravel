import { useState } from 'react'
import type { PoiDetails } from '../../lib/places'
import { errMessage } from '../../lib/errMessage'
import Icon from '../Icon'

interface PoiPopupProps {
  poi: PoiDetails
  dayLabel: string // 「加入行程」會排進的當天標籤，如「Day 2」
  onClose: () => void
  onAdd: (kind: 'point' | 'bookmark') => Promise<void>
}

// 點 Google 地標（POI）浮出的資訊卡（功能 4）：縮圖＋名稱＋地址/評分＋加入行程/書籤。
// 仿 MarkerPopup 樣式，但資料來自 Places 即時查詢、尚未存進 DB。
export default function PoiPopup({ poi, dayLabel, onClose, onAdd }: PoiPopupProps) {
  const [busy, setBusy] = useState<'point' | 'bookmark' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(kind: 'point' | 'bookmark') {
    setBusy(kind)
    setError(null)
    try {
      await onAdd(kind)
    } catch (e) {
      setError(errMessage(e))
      setBusy(null)
    }
  }

  return (
    <div
      className="pointer-events-auto absolute inset-x-4 z-[55] animate-fadeup"
      style={{ top: 'calc(env(safe-area-inset-top) + 120px)' }}
    >
      <div className="overflow-hidden rounded-lg bg-surface shadow-3">
        <div className="flex">
          {poi.photo_url ? (
            <img src={poi.photo_url} alt={poi.name} className="h-[88px] w-24 flex-none object-cover" />
          ) : (
            <div className="ph ph-cool w-24 flex-none" />
          )}
          <div className="min-w-0 flex-1 p-[11px]">
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-[15px] font-extrabold">{poi.name}</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="關閉"
                className="flex h-6 w-6 flex-none items-center justify-center text-ink-3"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
              {poi.rating != null && (
                <span className="inline-flex items-center gap-[3px] font-bold text-ink-2">
                  <Icon name="star" size={12} fill className="text-warn" />
                  {poi.rating.toFixed(1)}
                  {poi.userRatingCount != null && (
                    <span className="font-normal text-ink-3">（{poi.userRatingCount}）</span>
                  )}
                </span>
              )}
              {poi.address && <span className="truncate">{poi.address}</span>}
            </div>

            <div className="mt-[10px] flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => handleAdd('point')}
                className="flex items-center gap-1 rounded-[12px] bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
              >
                <Icon name="plus" size={14} /> {busy === 'point' ? '加入中…' : `加入 ${dayLabel}`}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => handleAdd('bookmark')}
                className="flex items-center gap-1 rounded-[12px] bg-pink-soft px-3 py-[7px] text-[13px] font-bold text-pink-deep active:scale-95 disabled:opacity-60"
              >
                <Icon name="heart" size={14} /> {busy === 'bookmark' ? '加入中…' : '加入書籤'}
              </button>
            </div>

            {error && <p className="mt-[8px] text-[12px] text-danger">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
