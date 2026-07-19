import { useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Field, { inputClassName } from './ui/Field'
import Icon from './Icon'
import InviteCodeCard from './InviteCodeCard'
import PlaceSearch, { type PickedPlace } from './map/PlaceSearch'
import { createTrip } from '../lib/api'
import { saveTripWithDaySync } from '../lib/tripDates'
import { useAuth } from '../lib/auth'
import { errMessage } from '../lib/errMessage'
import { env } from '../lib/env'
import type { Trip } from '../lib/types'

interface TripFormSheetProps {
  mode: 'create' | 'edit'
  trip?: Trip // edit 模式帶入既有旅程
  onClose: () => void
  onSaved: (trip: Trip) => void // 建立/修改成功後通知父層刷新列表
}

// 建立 / 修改旅程共用表單。目的地改用 Google 地點搜尋選定並存座標（功能 3 的地圖預設範圍退路）。
// 建立模式成功後切到「顯示邀請碼」階段；修改模式存檔即關閉。
export default function TripFormSheet({ mode, trip, onClose, onSaved }: TripFormSheetProps) {
  const { user } = useAuth()
  const [name, setName] = useState(trip?.name ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [destLat, setDestLat] = useState<number | null>(trip?.dest_lat ?? null)
  const [destLng, setDestLng] = useState<number | null>(trip?.dest_lng ?? null)
  const [destPlaceId, setDestPlaceId] = useState<string | null>(trip?.dest_place_id ?? null)
  const [start, setStart] = useState(trip?.start_date ?? '')
  const [end, setEnd] = useState(trip?.end_date ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [created, setCreated] = useState<Trip | null>(null)
  const [pickingDest, setPickingDest] = useState(false)

  const hasMaps = !!env.googleMapsApiKey
  const dateWarning = start && end && end < start ? '結束日早於出發日，仍可建立但請確認。' : null

  function handleDestPicked(place: PickedPlace) {
    setDestination(place.name)
    setDestLat(place.lat)
    setDestLng(place.lng)
    setDestPlaceId(place.google_place_id)
    setPickingDest(false)
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setErr('請輸入旅程名稱')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const payload = {
        name: name.trim(),
        destination: destination.trim() || null,
        start_date: start || null,
        end_date: end || null,
        dest_lat: destLat,
        dest_lng: destLng,
        dest_place_id: destPlaceId,
      }
      if (mode === 'create') {
        const t = await createTrip(payload)
        onSaved(t)
        setCreated(t) // 切到顯示邀請碼階段
      } else if (trip) {
        // 日期有變會同步 days（縮短天數時彈確認，取消則不做任何變更）
        const result = await saveTripWithDaySync(trip, payload, user?.id ?? null)
        if (!result) return
        onSaved(result.trip)
        onClose()
      }
    } catch (e) {
      setErr(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const heading = created ? '旅程建立完成' : mode === 'create' ? '建立新旅程' : '修改行程'

  return (
    <>
      <Sheet onClose={onClose}>
        <div className="flex items-center justify-between px-[22px] pt-[6px]">
          <h2 className="text-xl font-bold">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-ink-2"
            aria-label="關閉"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {!created ? (
          <>
            {/* min-h-0：flex 子層才能被壓縮而觸發捲動（見 gotcha-sheet-flex-scroll） */}
            <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pt-[18px]">
              <Field label="旅程名稱">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：大阪 5 日"
                  className={inputClassName}
                />
              </Field>

              <Field label="目的地">
                {hasMaps ? (
                  <button
                    type="button"
                    onClick={() => setPickingDest(true)}
                    className={`${inputClassName} flex items-center justify-between text-left`}
                  >
                    <span className={destination ? 'text-ink' : 'text-ink-3'}>
                      {destination || '搜尋城市或地區'}
                    </span>
                    <Icon name="search" size={18} className="flex-none text-ink-3" />
                  </button>
                ) : (
                  // 無地圖金鑰時退回純文字（無座標，仍可建立）
                  <input
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value)
                      setDestLat(null)
                      setDestLng(null)
                      setDestPlaceId(null)
                    }}
                    placeholder="輸入城市或地區"
                    className={inputClassName}
                  />
                )}
                {hasMaps && destLat != null && (
                  <span className="mt-[6px] inline-flex items-center gap-1 text-[12px] text-ink-3">
                    <Icon name="pin" size={13} className="text-ok" /> 已標定座標，地圖會以此為預設範圍
                  </span>
                )}
              </Field>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Field label="出發日">
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="結束日">
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </div>

              {mode === 'create' && (
                <Field label="邀請同伴">
                  <div className="rounded-[13px] border-[1.5px] border-line-strong px-3 py-[10px] text-[13px] leading-[1.5] text-ink-2">
                    建立後會產生一組 6 碼邀請碼，分享給另一半，對方在「用邀請碼加入」輸入即可一起編（限兩人）。
                  </div>
                </Field>
              )}

              {dateWarning && <p className="mb-2 text-[13px] text-warn">{dateWarning}</p>}
              {err && <p className="mb-2 text-[13px] text-danger">{err}</p>}
            </div>
            <div className="px-[22px] pb-[34px] pt-2">
              <Button variant="primary" block disabled={busy} onClick={handleSubmit}>
                <Icon name={mode === 'create' ? 'sparkle' : 'check'} size={18} />
                {busy ? '處理中…' : mode === 'create' ? '建立旅程' : '儲存變更'}
              </Button>
            </div>
          </>
        ) : (
          <div className="px-[22px] pb-[34px] pt-[18px]">
            <p className="mb-4 text-sm leading-[1.5] text-ink-2">
              把這組邀請碼傳給另一半，對方在「用邀請碼加入」輸入後，就能一起編「{created.name}」。
            </p>
            <div className="my-2 mb-5">
              <InviteCodeCard code={created.invite_code} />
            </div>
            <Button variant="primary" block onClick={onClose}>
              完成
            </Button>
          </div>
        )}
      </Sheet>

      {/* 目的地地點搜尋（需 APIProvider 提供 Places；只在挑選時掛載） */}
      {pickingDest && hasMaps && (
        <APIProvider apiKey={env.googleMapsApiKey} language="zh-TW" region="TW">
          <PlaceSearch
            title="選擇目的地"
            mode="pick"
            onClose={() => setPickingDest(false)}
            onPick={(place) => handleDestPicked(place)}
          />
        </APIProvider>
      )}
    </>
  )
}
