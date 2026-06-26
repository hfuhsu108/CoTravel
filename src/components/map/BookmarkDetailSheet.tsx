import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Day, Document, Item, TripMemberWithProfile } from '../../lib/types'
import { displayName, type ItemPatch } from '../../lib/itinerary'
import { kkdaySearchUrl, klookSearchUrl, openExternal } from '../../lib/deeplinks'
import { listDocumentsByItem } from '../../lib/documents'
import Icon from '../Icon'
import Avatar from '../Avatar'
import LinkedDocs from '../docs/LinkedDocs'
import DocLinkSheet from '../docs/DocLinkSheet'
import { DetailHead, InfoRow, Eyebrow } from './detail/parts'
import TagEditor from './detail/TagEditor'

interface BookmarkDetailSheetProps {
  item: Item
  days: Day[]
  members: TripMemberWithProfile[]
  meId: string
  onClose: () => void
  onUpdate: (patch: ItemPatch) => Promise<void>
  onScheduleToDay: (dayId: string) => Promise<void>
  onRemove: () => Promise<void>
}

interface LiveDetails {
  rating: number | null
  address: string | null
  hoursToday: string | null
}

function todayHours(descs: string[] | null | undefined): string | null {
  if (!descs || descs.length === 0) return null
  const idx = (new Date().getDay() + 6) % 7
  return descs[idx] ?? null
}

export default function BookmarkDetailSheet({
  item,
  days,
  members,
  meId,
  onClose,
  onUpdate,
  onScheduleToDay,
  onRemove,
}: BookmarkDetailSheetProps) {
  const { tripId = '' } = useParams()
  const places = useMapsLibrary('places')
  const author = members.find((m) => m.user_id === item.created_by)

  const [live, setLive] = useState<LiveDetails | null>(null)
  const [editingAlias, setEditingAlias] = useState(false)
  const [aliasDraft, setAliasDraft] = useState('')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [linkedDocs, setLinkedDocs] = useState<Document[]>([])
  const [manageOpen, setManageOpen] = useState(false)
  const [dayPickerOpen, setDayPickerOpen] = useState(false)

  useEffect(() => {
    if (!places || !item.google_place_id) return
    let active = true
    ;(async () => {
      try {
        const place = new places.Place({ id: item.google_place_id as string })
        await place.fetchFields({
          fields: ['rating', 'formattedAddress', 'regularOpeningHours'],
        })
        if (!active) return
        setLive({
          rating: place.rating ?? null,
          address: place.formattedAddress ?? null,
          hoursToday: todayHours(place.regularOpeningHours?.weekdayDescriptions),
        })
      } catch (e) {
        console.warn('[BookmarkDetail] 即時地點資訊取得失敗', e)
      }
    })()
    return () => {
      active = false
    }
  }, [places, item.google_place_id])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const docs = await listDocumentsByItem(item.id)
        if (active) setLinkedDocs(docs)
      } catch (e) {
        console.warn('[BookmarkDetail] 連結文件載入失敗', e)
      }
    })()
    return () => {
      active = false
    }
  }, [item.id])

  async function refreshLinked() {
    try {
      setLinkedDocs(await listDocumentsByItem(item.id))
    } catch (e) {
      console.warn('[BookmarkDetail] 連結文件載入失敗', e)
    }
  }

  async function saveIfChanged(patch: ItemPatch) {
    setBusy(true)
    try {
      await onUpdate(patch)
    } finally {
      setBusy(false)
    }
  }

  function saveAlias() {
    const next = aliasDraft.trim()
    const finalAlias = !next || next === item.name ? null : next
    if (finalAlias !== (item.alias ?? null)) void saveIfChanged({ alias: finalAlias })
    setEditingAlias(false)
  }

  function handleNavigate() {
    if (item.lat == null || item.lng == null) return
    const base = 'https://www.google.com/maps/search/?api=1'
    const q = `&query=${item.lat},${item.lng}`
    const pid = item.google_place_id ? `&query_place_id=${item.google_place_id}` : ''
    window.open(`${base}${q}${pid}`, '_blank', 'noopener,noreferrer')
  }

  const dayIndex =
    item.day_id != null ? days.find((d) => d.id === item.day_id)?.day_index : undefined
  const scheduled = dayIndex != null

  return (
    <div className="absolute inset-0 z-[72] flex flex-col bg-bg animate-slideleft">
      <div className="relative flex-none">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={displayName(item)}
            className="h-[210px] w-full object-cover"
          />
        ) : (
          <div className="ph flex h-[210px] items-center justify-center">
            <span className="ph-label">{displayName(item)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="返回"
          className="absolute left-[14px] flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/90 text-ink-2 shadow-1 active:scale-95"
          style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
        >
          <Icon name="back" size={20} />
        </button>

        {author && (
          <div
            className="absolute right-[14px]"
            style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
          >
            <Avatar
              name={author.profile?.display_name}
              avatarUrl={author.profile?.avatar_url}
              partner={author.user_id !== meId}
              size={30}
              ring
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-[18px]">
        <DetailHead
          title={
            editingAlias ? (
              <input
                autoFocus
                value={aliasDraft}
                onChange={(e) => setAliasDraft(e.target.value)}
                onBlur={saveAlias}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    saveAlias()
                  } else if (e.key === 'Escape') {
                    setEditingAlias(false)
                  }
                }}
                className="w-full rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[22px] font-bold text-ink outline-none focus:border-primary focus:bg-white"
              />
            ) : (
              <span className="inline-flex items-center gap-2">
                {displayName(item)}
                <button
                  type="button"
                  aria-label="編輯別名"
                  onClick={() => {
                    setAliasDraft(displayName(item))
                    setEditingAlias(true)
                  }}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-ink-3 active:scale-90"
                >
                  <Icon name="edit" size={16} />
                </button>
              </span>
            )
          }
          badge={
            scheduled ? (
              <span className="inline-flex items-center rounded-full bg-primary-soft px-[11px] py-[5px] text-[12.5px] font-bold text-primary-deep">
                Day {dayIndex}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-pink-soft px-[11px] py-[5px] text-[12.5px] font-bold text-pink-deep">
                書籤
              </span>
            )
          }
          sub={
            live?.rating != null || (item.alias && item.alias.trim()) ? (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {live?.rating != null && (
                  <span className="flex items-center gap-[5px]">
                    <span className="flex text-warn">
                      <Icon name="star" size={15} fill />
                    </span>
                    <b className="num text-ink">{live.rating}</b>
                  </span>
                )}
                {item.alias && item.alias.trim() && (
                  <span className="text-[12.5px] text-ink-3">原名：{item.name}</span>
                )}
              </span>
            ) : undefined
          }
        />

        <InfoRow icon="pin" label="地址" value={live?.address ?? '—'} />
        <InfoRow icon="clock" label="營業" value={live?.hoursToday ?? '—'} />

        <div className="my-4">
          <Eyebrow>清單</Eyebrow>
          <div className="mt-2">
            <TagEditor tags={item.tags} busy={busy} onChange={(tags) => void saveIfChanged({ tags })} />
          </div>
        </div>

        <div className="my-4">
          <Eyebrow>備註</Eyebrow>
          <textarea
            value={notes}
            disabled={busy}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              const next = notes.trim() || null
              if (next !== (item.notes ?? null)) void saveIfChanged({ notes: next })
            }}
            placeholder="想記的事，例如：門票記得帶、早點到避開人潮"
            rows={3}
            className="mt-2 w-full resize-none rounded-lg border border-line bg-surface-2 px-[15px] py-[13px] text-[14.5px] leading-[1.55] text-ink-2 outline-none focus:border-primary focus:bg-white"
          />
        </div>

        <LinkedDocs docs={linkedDocs} onManage={() => setManageOpen(true)} />

        <div className="mb-[10px]">
          <button
            type="button"
            onClick={handleNavigate}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-[14px] text-base font-bold text-white active:scale-[0.98]"
            style={{ boxShadow: '0 6px 16px rgba(122,108,240,.35)' }}
          >
            <Icon name="nav" size={17} /> 導航
          </button>
        </div>

        <div className="mb-[14px]">
          <Eyebrow>訂票・活動</Eyebrow>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => openExternal(kkdaySearchUrl(displayName(item)))}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[12px] text-[14px] font-bold text-primary-deep active:scale-[0.98]"
            >
              <Icon name="ticket" size={16} /> KKday
            </button>
            <button
              type="button"
              onClick={() => openExternal(klookSearchUrl(displayName(item)))}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[12px] text-[14px] font-bold text-primary-deep active:scale-[0.98]"
            >
              <Icon name="ticket" size={16} /> Klook
            </button>
          </div>
        </div>

        <div className="flex gap-[10px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => setDayPickerOpen((o) => !o)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-soft py-[14px] text-base font-bold text-primary-deep active:scale-[0.98] disabled:opacity-50"
          >
            <Icon name={scheduled ? 'move' : 'plus'} size={16} />
            {scheduled ? '改排到…' : '加到行程'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`確定要移除「${displayName(item)}」的書籤嗎？`)) {
                setBusy(true)
                onRemove().finally(() => setBusy(false))
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-md py-[14px] text-base font-bold text-danger active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--pink-soft)' }}
          >
            <Icon name="trash" size={16} /> 移除書籤
          </button>
        </div>

        {dayPickerOpen && (
          <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3">
            <div className="mb-2 text-[13px] font-bold text-ink-2">排到哪一天？</div>
            {days.length === 0 ? (
              <div className="text-[13px] text-ink-3">這趟還沒有天數可排</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {days.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={busy || d.id === item.day_id}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await onScheduleToDay(d.id)
                        setDayPickerOpen(false)
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="num rounded-full bg-white px-3 py-[6px] text-[13px] font-bold text-primary-deep shadow-1 active:scale-95 disabled:opacity-50"
                  >
                    Day {d.day_index}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {manageOpen && (
        <DocLinkSheet
          tripId={tripId}
          targetKind="item"
          targetId={item.id}
          onChanged={refreshLinked}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  )
}
