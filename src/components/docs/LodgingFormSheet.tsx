import { useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { createLodging, updateLodging } from '../../lib/lodgings'
import { uploadDocument, linkDocumentToLodging } from '../../lib/documents'
import { logActivity } from '../../lib/activity'
import { env } from '../../lib/env'
import { errMessage } from '../../lib/errMessage'
import type { Lodging } from '../../lib/types'
import Sheet from '../ui/Sheet'
import Field, { inputClassName } from '../ui/Field'
import Button from '../ui/Button'
import Icon from '../Icon'
import PlaceSearch, { type PickedPlace } from '../map/PlaceSearch'

interface LodgingFormSheetProps {
  tripId: string
  meId: string
  lodging?: Lodging | null // 提供＝編輯
  onClose: () => void
  onSaved: () => void
}

// 退房日 - 入住日 的天數（晚數）；無效回 0
function nightsBetween(ci: string, co: string): number {
  if (!ci || !co) return 0
  const a = new Date(`${ci}T00:00:00`)
  const b = new Date(`${co}T00:00:00`)
  const n = Math.round((b.getTime() - a.getTime()) / 86_400_000)
  return Number.isFinite(n) ? n : 0
}

// 新增/編輯住宿（比照航班）：搜飯店 → 選入住/退房 → 自動在對應日期頭尾建住宿項目。訂房單選填。
export default function LodgingFormSheet({
  tripId,
  meId,
  lodging = null,
  onClose,
  onSaved,
}: LodgingFormSheetProps) {
  const isEdit = !!lodging
  const [place, setPlace] = useState<PickedPlace | null>(
    lodging
      ? {
          name: lodging.name,
          lat: lodging.lat,
          lng: lodging.lng,
          google_place_id: lodging.google_place_id,
          photo_url: lodging.photo_url,
        }
      : null,
  )
  const [checkIn, setCheckIn] = useState(lodging?.check_in ?? '')
  const [checkOut, setCheckOut] = useState(lodging?.check_out ?? '')
  const [notes, setNotes] = useState(lodging?.notes ?? '')
  const [bookingFile, setBookingFile] = useState<File | null>(null)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nights = nightsBetween(checkIn, checkOut)
  const canSubmit = !busy && !!place && !!checkIn && !!checkOut && nights >= 1

  async function handleSubmit() {
    if (!place || !checkIn || !checkOut) {
      setError('請選飯店與入住/退房日期')
      return
    }
    if (nights < 1) {
      setError('退房日需晚於入住日')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // 有附訂房單 → 先上傳，拿到 doc_id（doc_id 仍存為「主訂房單」）
      let doc_id: string | null = lodging?.doc_id ?? null
      let uploadedDocId: string | null = null
      if (bookingFile) {
        const doc = await uploadDocument({ trip_id: tripId, category: 'lodging', file: bookingFile })
        doc_id = doc.id
        uploadedDocId = doc.id
      }
      const saved =
        isEdit && lodging
          ? await updateLodging(lodging.id, {
              name: place.name,
              lat: place.lat,
              lng: place.lng,
              google_place_id: place.google_place_id,
              photo_url: place.photo_url,
              check_in: checkIn,
              check_out: checkOut,
              notes: notes.trim() || null,
              doc_id,
            })
          : await createLodging({
              trip_id: tripId,
              name: place.name,
              lat: place.lat,
              lng: place.lng,
              google_place_id: place.google_place_id,
              photo_url: place.photo_url,
              check_in: checkIn,
              check_out: checkOut,
              notes: notes.trim() || null,
              doc_id,
            })
      // 新上傳的訂房單一併連到此住宿（多對多），行程的住宿項目即可動態看到
      if (uploadedDocId) {
        await linkDocumentToLodging(uploadedDocId, saved.id)
      }
      logActivity(
        tripId,
        meId,
        'item_add',
        isEdit ? `更新了住宿「${place.name}」` : `新增住宿「${place.name}」`,
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
        {/* min-h-0：包裝層也要能收縮，否則長內容把釘底按鈕擠出畫面（見 gotcha-sheet-flex-scroll） */}
        <div className="flex min-h-0 flex-col px-[22px] pb-[30px] pt-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">{isEdit ? '編輯住宿' : '新增住宿'}</h2>
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
            <Field label="飯店">
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-[14px] py-[12px] text-left text-[14px] outline-none active:scale-[0.99]"
              >
                <Icon name="bed" size={16} className="flex-none text-primary" />
                <span
                  className={`min-w-0 flex-1 truncate ${place ? 'font-semibold text-ink' : 'text-ink-3'}`}
                >
                  {place ? place.name : '搜尋飯店'}
                </span>
                <Icon name="search" size={15} className="flex-none text-ink-3" />
              </button>
            </Field>

            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="入住日">
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className={`${inputClassName} num`}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="退房日">
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || undefined}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className={`${inputClassName} num`}
                  />
                </Field>
              </div>
            </div>

            {nights > 0 && (
              <div className="mb-[15px] flex items-center gap-[6px] rounded-lg bg-primary-soft px-[14px] py-[10px] text-[13px] font-bold text-primary-deep">
                <Icon name="bed" size={14} /> 共 <span className="num">{nights}</span> 晚（每天頭尾會自動放入飯店）
              </div>
            )}

            <Field label="備註（訂房代號、房型、含早餐…）">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：訂房代號 ABC123、雙人房含早"
                className={inputClassName}
              />
            </Field>

            <Field label="訂房單（選填）">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-2 px-[14px] py-[12px] text-[13.5px] text-ink-3 active:scale-[0.99]">
                <Icon name={bookingFile ? 'check' : 'upload'} size={18} />
                <span className="break-all">
                  {bookingFile ? bookingFile.name : '上傳訂房單（PDF / 圖片）'}
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => setBookingFile(e.target.files?.[0] ?? null)}
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
              <Icon name="check" size={18} /> {busy ? '儲存中…' : isEdit ? '儲存住宿' : '建立住宿'}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* 飯店搜尋（文件分頁無 map context，自帶 APIProvider） */}
      {picking && (
        <APIProvider apiKey={env.googleMapsApiKey} language="zh-TW" region="TW">
          <PlaceSearch
            title="搜尋飯店"
            mode="pick"
            onClose={() => setPicking(false)}
            onPick={(p) => {
              setPlace(p)
              setPicking(false)
            }}
          />
        </APIProvider>
      )}
    </>
  )
}
