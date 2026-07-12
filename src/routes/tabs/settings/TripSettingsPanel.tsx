import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useAuth } from '../../../lib/auth'
import { deleteTrip, getTripWithMembers, leaveTrip } from '../../../lib/api'
import { saveTripWithDaySync } from '../../../lib/tripDates'
import { env } from '../../../lib/env'
import { errMessage } from '../../../lib/errMessage'
import type { TripWithMembers } from '../../../lib/types'
import Field, { inputClassName } from '../../../components/ui/Field'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/Icon'
import InviteCodeCard from '../../../components/InviteCodeCard'
import PlaceSearch, { type PickedPlace } from '../../../components/map/PlaceSearch'

// 設定→旅程設定（功能 a）：在旅程內就能改名/目的地/日期、看邀請碼、刪除（建立者）或退出（夥伴）。
// 建立者才可編輯與刪除（對齊 RLS「creator update/delete trips」）；夥伴看唯讀資訊並可退出。
export default function TripSettingsPanel() {
  const { tripId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const meId = user?.id ?? ''

  const [trip, setTrip] = useState<TripWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dateHint, setDateHint] = useState<string | null>(null) // 改期後的後續提醒
  const [danger, setDanger] = useState(false) // 危險操作二次確認

  // 編輯欄位
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [destLat, setDestLat] = useState<number | null>(null)
  const [destLng, setDestLng] = useState<number | null>(null)
  const [destPlaceId, setDestPlaceId] = useState<string | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [pickingDest, setPickingDest] = useState(false)

  const hasMaps = !!env.googleMapsApiKey
  const isOwner = !!trip && trip.created_by === meId
  const dateWarning = start && end && end < start ? '結束日早於出發日，仍可儲存但請確認。' : null

  useEffect(() => {
    let active = true
    setLoading(true)
    getTripWithMembers(tripId)
      .then((t) => {
        if (!active) return
        if (!t) {
          setError('找不到這趟旅程')
          return
        }
        setTrip(t)
        setName(t.name)
        setDestination(t.destination ?? '')
        setDestLat(t.dest_lat)
        setDestLng(t.dest_lng)
        setDestPlaceId(t.dest_place_id)
        setStart(t.start_date ?? '')
        setEnd(t.end_date ?? '')
      })
      .catch((e) => active && setError(errMessage(e)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [tripId])

  function handleDestPicked(place: PickedPlace) {
    setDestination(place.name)
    setDestLat(place.lat)
    setDestLng(place.lng)
    setDestPlaceId(place.google_place_id)
    setPickingDest(false)
    setSaved(false)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('請輸入旅程名稱')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await saveTripWithDaySync(
        { id: tripId, start_date: trip?.start_date ?? null, end_date: trip?.end_date ?? null },
        {
          name: name.trim(),
          destination: destination.trim() || null,
          start_date: start || null,
          end_date: end || null,
          dest_lat: destLat,
          dest_lng: destLng,
          dest_place_id: destPlaceId,
        },
        meId || null,
      )
      if (!result) return // 縮短天數的確認被取消，不做任何變更
      setTrip((cur) => (cur ? { ...cur, ...result.trip } : cur))
      setSaved(true)
      setDateHint(
        result.synced
          ? '每日行程已對應新日期。住宿與機票的日期不會自動更改，如需調整請到文件匣編輯（會自動重排到正確的天）。' +
              (result.movedToBookmark > 0 ? `已有 ${result.movedToBookmark} 個項目退回書籤。` : '')
          : null,
      )
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteTrip(tripId)
      navigate('/trips')
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  async function handleLeave() {
    setBusy(true)
    setError(null)
    try {
      await leaveTrip(tripId, meId)
      navigate('/trips')
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-[13px] text-ink-3">載入中…</div>
  }
  if (!trip) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 px-3 py-6 text-center text-[13px] text-ink-3">
        {error ?? '找不到這趟旅程'}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">{error}</div>
      )}

      <Field label="旅程名稱">
        <input
          value={name}
          disabled={!isOwner || busy}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
          placeholder="例如：大阪 5 日"
          className={inputClassName}
        />
      </Field>

      <Field label="目的地">
        {isOwner && hasMaps ? (
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
          <input
            value={destination}
            disabled={!isOwner}
            onChange={(e) => {
              setDestination(e.target.value)
              setDestLat(null)
              setDestLng(null)
              setDestPlaceId(null)
              setSaved(false)
            }}
            placeholder="輸入城市或地區"
            className={inputClassName}
          />
        )}
      </Field>

      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="出發日">
            <input
              type="date"
              value={start}
              disabled={!isOwner || busy}
              onChange={(e) => {
                setStart(e.target.value)
                setSaved(false)
              }}
              className={inputClassName}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="結束日">
            <input
              type="date"
              value={end}
              disabled={!isOwner || busy}
              onChange={(e) => {
                setEnd(e.target.value)
                setSaved(false)
              }}
              className={inputClassName}
            />
          </Field>
        </div>
      </div>

      {dateWarning && <p className="mb-2 text-[13px] text-warn">{dateWarning}</p>}

      {isOwner && (
        <Button variant="primary" block disabled={busy} onClick={handleSave}>
          <Icon name="check" size={18} /> {busy ? '儲存中…' : saved ? '已儲存' : '儲存變更'}
        </Button>
      )}
      {dateHint && (
        <p className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-[12.5px] leading-[1.6] text-ink-2">
          <Icon name="info" size={13} className="mr-1 inline-block" />
          {dateHint}
        </p>
      )}
      {!isOwner && (
        <p className="mb-1 text-[12.5px] text-ink-3">只有建立者能修改旅程資料；你可以查看並使用邀請碼。</p>
      )}

      {/* 邀請碼 */}
      <div className="mb-2 mt-6">
        <h2 className="mb-2 text-[15px] font-bold">邀請同伴</h2>
        <InviteCodeCard code={trip.invite_code} />
      </div>

      {/* 危險區 */}
      <div className="mt-6 border-t border-line pt-4">
        {!danger ? (
          <Button variant="plain" block onClick={() => setDanger(true)} className="!text-danger">
            <Icon name={isOwner ? 'trash' : 'back'} size={18} /> {isOwner ? '刪除旅程' : '退出旅程'}
          </Button>
        ) : (
          <div className="rounded-lg border border-line bg-[#fff5f6] p-4">
            <p className="mb-3 text-[13px] leading-[1.6] text-ink-2">
              {isOwner
                ? '這會永久刪除整趟行程、地圖項目、交通、文件與行李清單，且無法復原。夥伴也將失去存取。'
                : '退出後你將無法再存取這趟旅程，需要重新用邀請碼加入。'}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="dark"
                block
                disabled={busy}
                onClick={isOwner ? handleDelete : handleLeave}
                className="!bg-danger"
              >
                <Icon name={isOwner ? 'trash' : 'back'} size={18} />
                {busy ? '處理中…' : isOwner ? '確定刪除' : '確定退出'}
              </Button>
              <Button variant="plain" block disabled={busy} onClick={() => setDanger(false)}>
                取消
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 目的地搜尋（需 APIProvider 提供 Places；只在挑選時掛載） */}
      {pickingDest && hasMaps && (
        <APIProvider apiKey={env.googleMapsApiKey} language="zh-TW" region="TW">
          <PlaceSearch
            title="選擇目的地"
            mode="pick"
            onClose={() => setPickingDest(false)}
            onPick={handleDestPicked}
          />
        </APIProvider>
      )}
    </>
  )
}
