import { useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { addItem, listDays, updateItem } from '../../lib/itinerary'
import { upsertTransport, type FlightView } from '../../lib/transports'
import { uploadDocument, linkDocumentToTransport } from '../../lib/documents'
import { logActivity } from '../../lib/activity'
import {
  tzForCoords,
  tzLabel,
  tzOffsetDiffLabel,
  spanMinutes,
  formatDurationZh,
} from '../../lib/time'
import { env } from '../../lib/env'
import { errMessage } from '../../lib/errMessage'
import Sheet from '../ui/Sheet'
import Field, { inputClassName } from '../ui/Field'
import Button from '../ui/Button'
import Time24Field from '../ui/Time24Field'
import Icon from '../Icon'
import PlaceSearch, { type PickedPlace } from '../map/PlaceSearch'

interface FlightFormSheetProps {
  tripId: string
  meId: string
  flight?: FlightView | null // 提供＝編輯既有航班（機場固定，只改時間/編號/備註/機票）
  onClose: () => void
  onSaved: () => void // 通知 DocsTab 重新載入航班
}

function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// 新增/編輯航班（功能 5）：搜兩機場 → 自動時區/時差/飛行時數 → 送出時自動建立起訖機場 point
// 並建立 mode='flight' 的交通段；機票檔選填（上傳後連到該航班）。
export default function FlightFormSheet({
  tripId,
  meId,
  flight = null,
  onClose,
  onSaved,
}: FlightFormSheetProps) {
  const isEdit = !!flight
  const t = flight?.transport ?? null

  const [flightNo, setFlightNo] = useState(t?.flight_no ?? '')
  // 編輯時機場固定（用既有 item 顯示，不重建）；新增時可搜尋
  const [depAirport, setDepAirport] = useState<PickedPlace | null>(
    flight?.fromItem
      ? {
          name: flight.fromItem.name,
          lat: flight.fromItem.lat,
          lng: flight.fromItem.lng,
          google_place_id: null,
          photo_url: null,
        }
      : null,
  )
  const [arrAirport, setArrAirport] = useState<PickedPlace | null>(
    flight?.toItem
      ? {
          name: flight.toItem.name,
          lat: flight.toItem.lat,
          lng: flight.toItem.lng,
          google_place_id: null,
          photo_url: null,
        }
      : null,
  )
  // 拆成日期（原生 picker，無 12h 問題）＋ 自製 24h 時間欄；下游沿用組回的 departLocal/arriveLocal
  const initDepart = t?.depart_local?.slice(0, 16) ?? ''
  const initArrive = t?.arrive_local?.slice(0, 16) ?? ''
  const [departDate, setDepartDate] = useState(initDepart.slice(0, 10))
  const [departTime, setDepartTime] = useState(initDepart.slice(11, 16))
  const [arriveDate, setArriveDate] = useState(initArrive.slice(0, 10))
  const [arriveTime, setArriveTime] = useState(initArrive.slice(11, 16))
  const departLocal = departDate && departTime ? `${departDate}T${departTime}` : ''
  const arriveLocal = arriveDate && arriveTime ? `${arriveDate}T${arriveTime}` : ''
  const [departTerminal, setDepartTerminal] = useState(t?.depart_terminal ?? '')
  const [arriveTerminal, setArriveTerminal] = useState(t?.arrive_terminal ?? '')
  const [notes, setNotes] = useState(t?.notes ?? '')
  const [ticketFile, setTicketFile] = useState<File | null>(null)
  const [picking, setPicking] = useState<'dep' | 'arr' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 機場時區（編輯用既有 item，新增用座標推）
  const departTz = flight?.fromItem?.timezone ?? tzForCoords(depAirport?.lat, depAirport?.lng)
  const arriveTz = flight?.toItem?.timezone ?? tzForCoords(arrAirport?.lat, arrAirport?.lng)
  const diffLabel =
    departTz && arriveTz ? tzOffsetDiffLabel(departTz, arriveTz, departLocal || undefined) : null
  const rawMin =
    departLocal && arriveLocal && departTz && arriveTz
      ? spanMinutes(departLocal, departTz, arriveLocal, arriveTz)
      : null
  const flightMin = rawMin != null && rawMin >= 0 ? rawMin : null

  const canSubmit =
    !busy && !!depAirport && !!arrAirport && !!departLocal && !!arriveLocal && !!departTz && !!arriveTz

  async function handleSubmit() {
    if (!depAirport || !arrAirport || !departLocal || !arriveLocal) {
      setError('請填出發/抵達機場與時間')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let fromId: string
      let toId: string
      let depTz = departTz
      let arrTz = arriveTz

      if (isEdit && t) {
        // 編輯：機場固定，只更新兩端 item 的時間
        fromId = t.from_item_id
        toId = t.to_item_id
        // 出發機場：起飛＝離開時間；抵達機場：降落＝抵達時間
        await updateItem(fromId, { departure_time: departLocal.slice(11, 16) })
        await updateItem(toId, { scheduled_time: arriveLocal.slice(11, 16) })
      } else {
        // 新增：依航班當地日期排到對應那天（無對應 → 今天那天 → Day 1 → 無則書籤）
        const days = await listDays(tripId)
        const dayFor = (date: string): string | null =>
          days.find((d) => d.date === date)?.id ??
          days.find((d) => d.date === todayStr())?.id ??
          days[0]?.id ??
          null
        const depDayId = dayFor(departLocal.slice(0, 10))
        const arrDayId = dayFor(arriveLocal.slice(0, 10))
        const depItem = await addItem({
          trip_id: tripId,
          type: 'point',
          status: depDayId ? 'scheduled' : 'bookmark',
          day_id: depDayId,
          name: depAirport.name,
          lat: depAirport.lat,
          lng: depAirport.lng,
          google_place_id: depAirport.google_place_id,
          photo_url: depAirport.photo_url, // 自動帶機場照片（搜尋時已抓）
          departure_time: departLocal.slice(11, 16), // 起飛＝離開時間
        })
        const arrItem = await addItem({
          trip_id: tripId,
          type: 'point',
          status: arrDayId ? 'scheduled' : 'bookmark',
          day_id: arrDayId,
          name: arrAirport.name,
          lat: arrAirport.lat,
          lng: arrAirport.lng,
          google_place_id: arrAirport.google_place_id,
          photo_url: arrAirport.photo_url, // 自動帶機場照片
          scheduled_time: arriveLocal.slice(11, 16),
        })
        fromId = depItem.id
        toId = arrItem.id
        // 以建立後 item 上實際存的時區為準（addItem 由座標自動推）
        depTz = depItem.timezone ?? departTz
        arrTz = arrItem.timezone ?? arriveTz
      }

      const transport = await upsertTransport({
        trip_id: tripId,
        from_item_id: fromId,
        to_item_id: toId,
        mode: 'flight',
        flight_no: flightNo.trim() || null,
        depart_local: departLocal,
        depart_tz: depTz,
        arrive_local: arriveLocal,
        arrive_tz: arrTz,
        depart_terminal: departTerminal.trim() || null,
        arrive_terminal: arriveTerminal.trim() || null,
        duration_min: flightMin,
        notes: notes.trim() || null,
      })

      if (ticketFile) {
        const doc = await uploadDocument({ trip_id: tripId, category: 'flight', file: ticketFile })
        await linkDocumentToTransport(doc.id, transport.id)
      }

      const route = `${depAirport.name} → ${arrAirport.name}`
      logActivity(
        tripId,
        meId,
        'transport_set',
        isEdit
          ? `更新了航班 ${flightNo.trim()}（${route}）`.trim()
          : `新增航班 ${flightNo.trim()}（${route}）`.trim(),
      )
      onSaved()
      onClose()
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <>
      <Sheet onClose={onClose}>
        <div className="flex max-h-full flex-col px-[22px] pb-[30px] pt-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">{isEdit ? '編輯航班' : '新增航班'}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="flex h-8 w-8 items-center justify-center text-ink-3"
            >
              <Icon name="x" size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Field label="航班編號">
              <input
                value={flightNo}
                onChange={(e) => setFlightNo(e.target.value.toUpperCase())}
                placeholder="例如：BR198"
                className={`${inputClassName} num`}
              />
            </Field>

            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="出發機場">
                  <AirportField
                    airport={depAirport}
                    disabled={isEdit}
                    onPick={() => setPicking('dep')}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="抵達機場">
                  <AirportField
                    airport={arrAirport}
                    disabled={isEdit}
                    onPick={() => setPicking('arr')}
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="出發航廈（選填）">
                  <input
                    value={departTerminal}
                    onChange={(e) => setDepartTerminal(e.target.value)}
                    placeholder="如 第2航廈 / T1"
                    className={inputClassName}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="抵達航廈（選填）">
                  <input
                    value={arriveTerminal}
                    onChange={(e) => setArriveTerminal(e.target.value)}
                    placeholder="如 T2"
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="出發時間（當地）">
                  <input
                    type="date"
                    value={departDate}
                    onChange={(e) => setDepartDate(e.target.value)}
                    className={`${inputClassName} num`}
                    aria-label="出發日期"
                  />
                  <Time24Field
                    value={departTime}
                    onChange={setDepartTime}
                    onCommit={setDepartTime}
                    className={`${inputClassName} num mt-2 text-center`}
                    ariaLabel="出發時間"
                  />
                  {departTz && (
                    <p className="mt-1 text-[11.5px] text-ink-3">{tzLabel(departTz, departLocal || undefined)}</p>
                  )}
                </Field>
              </div>
              <div className="flex-1">
                <Field label="抵達時間（當地）">
                  <input
                    type="date"
                    value={arriveDate}
                    onChange={(e) => setArriveDate(e.target.value)}
                    className={`${inputClassName} num`}
                    aria-label="抵達日期"
                  />
                  <Time24Field
                    value={arriveTime}
                    onChange={setArriveTime}
                    onCommit={setArriveTime}
                    className={`${inputClassName} num mt-2 text-center`}
                    ariaLabel="抵達時間"
                  />
                  {arriveTz && (
                    <p className="mt-1 text-[11.5px] text-ink-3">{tzLabel(arriveTz, arriveLocal || undefined)}</p>
                  )}
                </Field>
              </div>
            </div>

            {(flightMin != null || diffLabel) && (
              <div className="mb-[15px] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-primary-soft px-[14px] py-[11px] text-[13px] font-bold text-primary-deep">
                {flightMin != null && (
                  <span className="flex items-center gap-[6px]">
                    <Icon name="clock" size={14} /> 飛行 {formatDurationZh(flightMin)}
                  </span>
                )}
                {diffLabel && <span>時差 {diffLabel}</span>}
              </div>
            )}

            <Field label="備註（登機門、座位、訂位代號…）">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：Gate 12、35K、訂位代號 ABCDEF"
                className={inputClassName}
              />
            </Field>

            <Field label="機票檔（選填）">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-2 px-[14px] py-[12px] text-[13.5px] text-ink-3 active:scale-[0.99]">
                <Icon name={ticketFile ? 'check' : 'upload'} size={18} />
                <span className="break-all">{ticketFile ? ticketFile.name : '上傳機票（PDF / 圖片）'}</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => setTicketFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </Field>
          </div>

          {error && (
            <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
              {error}
            </div>
          )}

          <div className="pt-3">
            <Button variant="primary" block disabled={!canSubmit} onClick={handleSubmit}>
              <Icon name="check" size={18} /> {busy ? '儲存中…' : isEdit ? '儲存航班' : '建立航班'}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* 機場搜尋（需 Google Maps APIProvider；文件分頁無 map context，故自帶一個） */}
      {picking && (
        <APIProvider apiKey={env.googleMapsApiKey} language="zh-TW" region="TW">
          <PlaceSearch
            title={picking === 'dep' ? '搜尋出發機場' : '搜尋抵達機場'}
            mode="pick"
            onClose={() => setPicking(null)}
            onPick={(place) => {
              if (picking === 'dep') setDepAirport(place)
              else setArrAirport(place)
              setPicking(null)
            }}
          />
        </APIProvider>
      )}
    </>
  )
}

function AirportField({
  airport,
  disabled,
  onPick,
}: {
  airport: PickedPlace | null
  disabled: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className="flex w-full items-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-[14px] py-[12px] text-left text-[14px] outline-none active:scale-[0.99] disabled:opacity-70 disabled:active:scale-100"
    >
      <Icon name="plane" size={16} className="flex-none text-primary" />
      <span className={`min-w-0 flex-1 truncate ${airport ? 'font-semibold text-ink' : 'text-ink-3'}`}>
        {airport ? airport.name : '搜尋機場'}
      </span>
      {!disabled && <Icon name="search" size={15} className="flex-none text-ink-3" />}
    </button>
  )
}
