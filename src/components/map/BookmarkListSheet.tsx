import { useMemo, useState } from 'react'
import type { Day, Item } from '../../lib/types'
import { displayName } from '../../lib/itinerary'
import Sheet from '../ui/Sheet'
import Icon from '../Icon'

const UNTAGGED = '未分類' // 唯一的預設分組：尚未貼標籤的書籤都歸在這裡

interface BookmarkListSheetProps {
  bookmarks: Item[] // is_bookmarked 的項目（含已排入某天者）
  days: Day[]
  knownTags: string[] // 全趟用過的標籤（供快速選用）
  onClose: () => void
  onAddBookmark: () => void
  onScheduleToDay: (item: Item, dayId: string) => Promise<void>
  onRemove: (item: Item) => Promise<void> // 已排入→只移出收藏；純書籤→整筆刪
  onUpdateTags: (item: Item, tags: string[]) => Promise<void>
}

// 書籤（收藏）列表（功能 2）：依標籤分組成區塊（景點、餐廳…，可自訂；未貼者歸「未分類」）。
// 每筆可直接貼/移標籤、加到行程、刪除。加到行程後仍留在列表（is_bookmarked 不變）。
export default function BookmarkListSheet({
  bookmarks,
  days,
  knownTags,
  onClose,
  onAddBookmark,
  onScheduleToDay,
  onRemove,
  onUpdateTags,
}: BookmarkListSheetProps) {
  // 依標籤分組：每個標籤一組（多標籤者出現在多組），未貼標籤者歸「未分類」
  const sections = useMemo(() => {
    const tagSet = new Set<string>()
    for (const b of bookmarks) for (const t of b.tags) tagSet.add(t)
    const tags = [...tagSet].sort((a, b) => a.localeCompare(b))
    const result: { tag: string; items: Item[] }[] = tags.map((t) => ({
      tag: t,
      items: bookmarks.filter((b) => b.tags.includes(t)),
    }))
    const untagged = bookmarks.filter((b) => b.tags.length === 0)
    if (untagged.length > 0) result.push({ tag: UNTAGGED, items: untagged })
    return result
  }, [bookmarks])

  return (
    <Sheet onClose={onClose}>
      <div className="flex max-h-full flex-col px-[22px] pb-[28px] pt-1">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            書籤 <span className="num text-ink-3">{bookmarks.length}</span>
          </h2>
          <button
            type="button"
            onClick={onAddBookmark}
            className="inline-flex items-center gap-1 rounded-full bg-pink-soft px-[14px] py-2 text-[13px] font-bold text-pink-deep active:scale-95"
          >
            <Icon name="plus" size={15} /> 新增書籤
          </button>
        </div>
        <p className="mb-3 text-[12.5px] text-ink-3">依清單分類收藏；加到行程後仍留在這裡。</p>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <div className="ph ph-warm flex h-24 w-[120px] items-center justify-center rounded-lg">
                <span className="ph-label">還沒有書籤</span>
              </div>
              <p className="text-[14px] leading-[1.5] text-ink-3">
                在地圖搜尋或點地標，按「加入書籤」收藏想去的地方。
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-2">
              {sections.map((sec) => (
                <div key={sec.tag}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-[11px] py-[4px] text-[12.5px] font-bold ${
                        sec.tag === UNTAGGED
                          ? 'bg-line text-ink-3'
                          : 'bg-primary-soft text-primary-deep'
                      }`}
                    >
                      {sec.tag !== UNTAGGED && <Icon name="bookmark" size={12} />}
                      {sec.tag}
                    </span>
                    <span className="num text-[12px] text-ink-3">{sec.items.length}</span>
                  </div>
                  <div className="flex flex-col gap-[10px]">
                    {sec.items.map((b) => (
                      <BookmarkRow
                        key={`${sec.tag}:${b.id}`}
                        item={b}
                        days={days}
                        knownTags={knownTags}
                        onScheduleToDay={onScheduleToDay}
                        onRemove={onRemove}
                        onUpdateTags={onUpdateTags}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

type Panel = 'tag' | 'day' | null

function BookmarkRow({
  item,
  days,
  knownTags,
  onScheduleToDay,
  onRemove,
  onUpdateTags,
}: {
  item: Item
  days: Day[]
  knownTags: string[]
  onScheduleToDay: (item: Item, dayId: string) => Promise<void>
  onRemove: (item: Item) => Promise<void>
  onUpdateTags: (item: Item, tags: string[]) => Promise<void>
}) {
  const [panel, setPanel] = useState<Panel>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')

  const dayIndex = item.day_id != null ? days.find((d) => d.id === item.day_id)?.day_index : undefined
  const scheduled = dayIndex != null
  const suggestable = knownTags.filter((t) => !item.tags.includes(t))

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  function addTag(raw: string) {
    const t = raw.trim()
    if (!t || item.tags.includes(t)) {
      setDraft('')
      return
    }
    void run(() => onUpdateTags(item, [...item.tags, t]))
    setDraft('')
  }

  function removeTag(t: string) {
    void run(() => onUpdateTags(item, item.tags.filter((x) => x !== t)))
  }

  return (
    <div className="rounded-lg bg-surface p-[10px] shadow-1">
      <div className="flex items-center gap-[11px]">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={displayName(item)}
            className="h-[52px] w-[52px] flex-none rounded-[13px] object-cover"
          />
        ) : (
          <div className="ph ph-warm h-[52px] w-[52px] flex-none rounded-[13px]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-extrabold">{displayName(item)}</div>
          <div className="mt-[3px] flex flex-wrap items-center gap-[6px]">
            <span
              className={`rounded-full px-[9px] py-[2px] text-[11px] font-bold ${
                scheduled ? 'bg-primary-soft text-primary-deep' : 'bg-pink-soft text-pink-deep'
              }`}
            >
              {scheduled ? `Day ${dayIndex}` : '未排入'}
            </span>
            {item.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-line px-[9px] py-[2px] text-[11px] font-bold text-ink-2"
              >
                {t}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeTag(t)}
                  aria-label={`移除標籤 ${t}`}
                  className="flex items-center text-ink-3 active:scale-90 disabled:opacity-50"
                >
                  <Icon name="x" size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(item)}
          aria-label="刪除書籤"
          className="flex h-8 w-8 flex-none items-center justify-center text-ink-3 active:scale-90 disabled:opacity-50"
        >
          <Icon name="trash" size={17} />
        </button>
      </div>

      <div className="mt-[10px] flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setPanel((p) => (p === 'tag' ? null : 'tag'))}
          className="flex items-center gap-1 rounded-[12px] bg-line px-3 py-[7px] text-[13px] font-bold text-ink-2 active:scale-95 disabled:opacity-60"
        >
          <Icon name="bookmark" size={14} /> 清單
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPanel((p) => (p === 'day' ? null : 'day'))}
          className="flex items-center gap-1 rounded-[12px] bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
        >
          <Icon name={scheduled ? 'move' : 'plus'} size={14} />
          {scheduled ? '改排到…' : '加到行程'}
        </button>
      </div>

      {panel === 'tag' && (
        <div className="mt-[10px] border-t border-line pt-[10px]">
          {suggestable.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestable.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={busy}
                  onClick={() => addTag(t)}
                  className="rounded-full bg-surface-2 px-3 py-[5px] text-[12.5px] font-bold text-ink-2 active:scale-95 disabled:opacity-50"
                  style={{ border: '1px solid var(--line)' }}
                >
                  + {t}
                </button>
              ))}
            </div>
          )}
          <input
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(draft)
              }
            }}
            placeholder="新增清單，Enter 加入"
            className="w-full rounded-[12px] border border-line-strong bg-surface-2 px-[12px] py-[8px] text-[13px] text-ink outline-none focus:border-primary focus:bg-white"
          />
        </div>
      )}

      {panel === 'day' && (
        <div className="mt-[10px] flex flex-wrap gap-2 border-t border-line pt-[10px]">
          {days.length === 0 && <span className="text-[12.5px] text-ink-3">這趟還沒有天數可排</span>}
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              disabled={busy || d.id === item.day_id}
              onClick={() =>
                run(async () => {
                  await onScheduleToDay(item, d.id)
                  setPanel(null)
                })
              }
              className="num rounded-full bg-primary-soft px-3 py-[5px] text-[12.5px] font-bold text-primary-deep active:scale-95 disabled:opacity-40"
            >
              Day {d.day_index}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
