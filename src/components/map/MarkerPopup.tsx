import { useState } from 'react'
import type { Day, Item } from '../../lib/types'
import { displayName } from '../../lib/itinerary'
import { googleMapsPlaceUrl, openExternal } from '../../lib/deeplinks'
import { useLivePlaceDetails } from '../../lib/useLivePlaceDetails'
import Icon from '../Icon'

interface MarkerPopupProps {
  item: Item
  days: Day[]
  onClose: () => void
  onOpenDetail: () => void
  onScheduleToDay: (dayId: string) => Promise<void> // 書籤「排入某天」用
}

// 點地圖標記浮出的小卡（畫面 2）：縮圖＋名稱＋基本資訊（評分／今日營業／備註）＋動作。
// 書籤 → 排入某天（展開日選）；已排入定點/區域 → 看詳情；皆可一鍵在 Google 地圖開啟。
export default function MarkerPopup({
  item,
  days,
  onClose,
  onOpenDetail,
  onScheduleToDay,
}: MarkerPopupProps) {
  const isBookmark = item.status === 'bookmark'
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  // 即時抓評分／今日營業（無 google_place_id 的區域回 null，不顯示這兩列）
  const live = useLivePlaceDetails(item.google_place_id)
  const hasCoord = item.lat != null && item.lng != null

  return (
    <div
      className="pointer-events-auto absolute inset-x-4 z-[55] animate-fadeup"
      style={{ top: 'calc(env(safe-area-inset-top) + 120px)' }}
    >
      <div className="overflow-hidden rounded-lg bg-surface shadow-3">
        <div className="flex">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={displayName(item)}
              className="w-24 flex-none self-stretch object-cover"
              style={{ minHeight: 88 }}
            />
          ) : (
            <div className={`ph w-24 flex-none self-stretch ${isBookmark ? 'ph-warm' : 'ph-cool'}`} style={{ minHeight: 88 }} />
          )}
          <div className="min-w-0 flex-1 p-[11px]">
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-[15px] font-extrabold">{displayName(item)}</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="關閉"
                className="flex h-6 w-6 flex-none items-center justify-center text-ink-3"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {isBookmark ? (
              <span className="mt-[6px] inline-flex rounded-full bg-pink-soft px-[10px] py-[3px] text-[12px] font-bold text-pink-deep">
                想去・尚未排入
              </span>
            ) : (
              <span className="mt-[6px] inline-flex rounded-full bg-primary-soft px-[10px] py-[3px] text-[12px] font-bold text-primary-deep">
                {item.type === 'area' ? '區域' : '已排入行程'}
              </span>
            )}

            {/* 評分／今日營業（即時查詢，抓不到就不顯示） */}
            {(live?.rating != null || live?.hoursToday) && (
              <div className="mt-[6px] flex flex-col gap-[3px] text-[12px] text-ink-3">
                {live?.rating != null && (
                  <span className="inline-flex items-center gap-[3px] font-bold text-ink-2">
                    <Icon name="star" size={12} fill className="text-warn" />
                    {live.rating.toFixed(1)}
                  </span>
                )}
                {live?.hoursToday && (
                  <span className="flex items-center gap-[4px]">
                    <Icon name="clock" size={12} className="flex-none" />
                    <span className="truncate">{live.hoursToday}</span>
                  </span>
                )}
              </div>
            )}

            {/* 我寫的備註（截兩行，避免小卡過高） */}
            {item.notes && (
              <p
                className="mt-[6px] text-[12.5px] leading-[1.5] text-ink-2"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.notes}
              </p>
            )}

            <div className="mt-[10px] flex flex-wrap gap-2">
              {isBookmark ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-[12px] bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95"
                >
                  <Icon name="plus" size={14} /> 排入某天
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenDetail}
                  className="flex items-center gap-1 rounded-[12px] bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95"
                >
                  <Icon name="list" size={14} /> 看詳情
                </button>
              )}
              {hasCoord && (
                <button
                  type="button"
                  onClick={() =>
                    openExternal(
                      googleMapsPlaceUrl(item.lat as number, item.lng as number, item.google_place_id),
                    )
                  }
                  className="flex items-center gap-1 rounded-[12px] bg-surface-2 px-3 py-[7px] text-[13px] font-bold text-ink-2 active:scale-95"
                >
                  <Icon name="nav" size={14} /> Google 地圖
                </button>
              )}
            </div>

            {isBookmark && pickerOpen && (
              <div className="mt-[10px] flex flex-wrap gap-2 border-t border-line pt-[10px]">
                {days.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await onScheduleToDay(d.id)
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="num rounded-full bg-primary-soft px-3 py-[5px] text-[12.5px] font-bold text-primary-deep active:scale-95 disabled:opacity-50"
                  >
                    Day {d.day_index}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
