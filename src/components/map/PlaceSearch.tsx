import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import Icon from '../Icon'
import { errMessage } from '../../lib/errMessage'

// 搜尋選到的地點（只取要持久化的欄位；rating/地址/營業時間於詳情頁用 place_id 即時抓）
export interface PickedPlace {
  name: string
  lat: number | null
  lng: number | null
  google_place_id: string | null
  photo_url: string | null
}

export type PickKind = 'point' | 'bookmark' | 'candidate' | 'pick'

interface PlaceSearchProps {
  title: string
  // add=加為定點/加入書籤；candidate=加為候選；pick=單純選定一個地點（旅程目的地用）
  mode: 'add' | 'candidate' | 'pick'
  onClose: () => void
  onPick: (place: PickedPlace, kind: PickKind) => Promise<void> | void
  bias?: google.maps.LatLngLiteral | google.maps.LatLngBoundsLiteral
}

// Google 地點搜尋（新版 Places API：AutocompleteSuggestion + Place.fetchFields）。
// 需在 Google Cloud 啟用「Places API (New)」，否則回 REQUEST_DENIED（見 docs/06）。
export default function PlaceSearch({ title, mode, onClose, onPick, bias }: PlaceSearchProps) {
  const places = useMapsLibrary('places')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // session token 跨整段搜尋共用，選定後失效；用 ref 保存當前 token
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  // debounce 查詢
  useEffect(() => {
    if (!places) return
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    let active = true
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        if (!tokenRef.current) tokenRef.current = new places.AutocompleteSessionToken()
        const { suggestions: res } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          {
            input: q,
            sessionToken: tokenRef.current,
            language: 'zh-TW',
            region: 'TW',
            ...(bias ? { locationBias: bias } : {}),
          },
        )
        if (!active) return
        setSuggestions(
          res.map((s) => s.placePrediction).filter((p): p is google.maps.places.PlacePrediction => !!p),
        )
        setError(null)
      } catch (e) {
        if (active) {
          setSuggestions([])
          setError(errMessage(e))
        }
      } finally {
        if (active) setSearching(false)
      }
    }, 280)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, places, bias])

  async function handlePick(pred: google.maps.places.PlacePrediction, kind: PickKind) {
    setBusyId(pred.placeId + kind)
    setError(null)
    try {
      const place = pred.toPlace()
      await place.fetchFields({ fields: ['displayName', 'location', 'id', 'photos'] })
      const picked: PickedPlace = {
        name: place.displayName ?? pred.mainText?.text ?? pred.text.text,
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
        google_place_id: place.id ?? pred.placeId,
        photo_url: place.photos?.[0]?.getURI({ maxWidth: 400 }) ?? null,
      }
      await onPick(picked, kind)
      // 一次 session 結束，下次搜尋換新 token
      tokenRef.current = null
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="absolute inset-0 z-[72] flex flex-col bg-bg animate-slideup">
      <div
        className="flex items-center gap-2 px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉搜尋"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] border border-line bg-surface text-ink-2 shadow-1 active:scale-95"
        >
          <Icon name="back" size={20} />
        </button>
        <h2 className="text-[17px] font-bold">{title}</h2>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-[10px] rounded-[14px] border-[1.5px] border-line-strong bg-surface-2 px-[14px] py-[13px] focus-within:border-primary focus-within:bg-white">
          <Icon name="search" size={19} className="text-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋景點、餐廳、地址…"
            className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清除" className="text-ink-3">
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {error && (
          <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}
        {searching && suggestions.length === 0 && (
          <div className="py-6 text-center text-[13px] text-ink-3">搜尋中…</div>
        )}
        {!searching && query.trim().length >= 2 && suggestions.length === 0 && !error && (
          <div className="py-6 text-center text-[13px] text-ink-3">找不到符合的地點</div>
        )}

        <div className="flex flex-col">
          {suggestions.map((pred) => (
            <div key={pred.placeId} className="border-b border-line py-3">
              <div className="flex items-start gap-2">
                <Icon name="pin" size={18} className="mt-[2px] flex-none text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">
                    {pred.mainText?.text ?? pred.text.text}
                  </div>
                  {pred.secondaryText?.text && (
                    <div className="truncate text-[12.5px] text-ink-3">{pred.secondaryText.text}</div>
                  )}
                </div>
              </div>
              <div className="mt-[10px] flex gap-2 pl-[26px]">
                {mode === 'add' ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => handlePick(pred, 'point')}
                      className="flex items-center gap-1 rounded-[12px] bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
                    >
                      <Icon name="plus" size={14} /> 加為定點
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => handlePick(pred, 'bookmark')}
                      className="flex items-center gap-1 rounded-[12px] bg-pink-soft px-3 py-[7px] text-[13px] font-bold text-pink-deep active:scale-95 disabled:opacity-60"
                    >
                      <Icon name="heart" size={14} /> 加入書籤
                    </button>
                  </>
                ) : mode === 'pick' ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => handlePick(pred, 'pick')}
                    className="flex items-center gap-1 rounded-[12px] bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
                  >
                    <Icon name="check" size={14} /> 選擇此地點
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => handlePick(pred, 'candidate')}
                    className="flex items-center gap-1 rounded-[12px] bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
                  >
                    <Icon name="plus" size={14} /> 加為候選
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
