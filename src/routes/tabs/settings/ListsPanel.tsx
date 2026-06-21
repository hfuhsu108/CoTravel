import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useParams } from 'react-router-dom'
import { useTripRealtime } from '../../../lib/tripRealtime'
import {
  DEFAULT_LIST_COLOR,
  DEFAULT_LIST_ICON,
  LIST_COLORS,
  LIST_ICONS,
  createBookmarkList,
  deleteBookmarkList,
  ensureListsExist,
  listBookmarkLists,
  listInUseTags,
  renameBookmarkList,
  safeListIcon,
  setListStyle,
} from '../../../lib/bookmarkLists'
import { errMessage } from '../../../lib/errMessage'
import type { BookmarkList } from '../../../lib/types'
import Icon, { type IconName } from '../../../components/Icon'

// 設定→景點清單：管理書籤清單的名稱、圖示與顏色（會反映到地圖 marker）。
// 清單本體仍是 items.tags 名稱；改名/刪除由 lib 同步 items 的 tag。
export default function ListsPanel() {
  const { tripId = '' } = useParams()
  const { ticks } = useTripRealtime()

  const [lists, setLists] = useState<BookmarkList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editor, setEditor] = useState<'add' | string | null>(null) // 'add' 或 list.id
  const [draftName, setDraftName] = useState('')
  const [draftIcon, setDraftIcon] = useState<IconName>(DEFAULT_LIST_ICON)
  const [draftColor, setDraftColor] = useState<string>(DEFAULT_LIST_COLOR)

  const reload = useCallback(async () => {
    try {
      let rows = await listBookmarkLists(tripId)
      // 自我修復：items 用到但沒有 metadata 列的清單名（ensureListsExist 曾失敗的孤兒）→ 補建後再列
      const inUse = await listInUseTags(tripId)
      const have = new Set(rows.map((l) => l.name))
      const missing = inUse.filter((t) => !have.has(t))
      if (missing.length > 0) {
        await ensureListsExist(tripId, missing)
        rows = await listBookmarkLists(tripId)
      }
      setLists(rows)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void reload()
  }, [reload])

  // 清單 metadata 或 items（tag）他處變更 → 重載
  const listsTick = ticks.bookmark_lists
  const itemsTick = ticks.items
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    void reload()
  }, [listsTick, itemsTick, reload])

  function openAdd() {
    setError(null)
    setDraftName('')
    setDraftIcon(DEFAULT_LIST_ICON)
    setDraftColor(DEFAULT_LIST_COLOR)
    setEditor('add')
  }
  function openEdit(l: BookmarkList) {
    setError(null)
    setDraftName(l.name)
    setDraftIcon(safeListIcon(l.icon))
    setDraftColor(l.color || DEFAULT_LIST_COLOR)
    setEditor(l.id)
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await reload()
      setEditor(null)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveAdd() {
    const name = draftName.trim()
    if (!name) return
    if (lists.some((l) => l.name === name)) {
      setError('已有同名清單')
      return
    }
    await run(async () => {
      await createBookmarkList(tripId, { name, icon: draftIcon, color: draftColor })
    })
  }

  async function saveEdit(l: BookmarkList) {
    const name = draftName.trim()
    if (!name) return
    if (name !== l.name && lists.some((x) => x.id !== l.id && x.name === name)) {
      setError('已有同名清單')
      return
    }
    await run(async () => {
      if (name !== l.name) await renameBookmarkList(tripId, l.name, name)
      await setListStyle(l.id, { icon: draftIcon, color: draftColor })
    })
  }

  async function doDelete(l: BookmarkList) {
    if (!window.confirm(`刪除清單「${l.name}」？會從所有景點移除這個清單標記（景點本身保留）。`)) return
    await run(() => deleteBookmarkList(tripId, l.name))
  }

  return (
    <>
      <p className="mb-3 text-[12.5px] text-ink-3">
        管理書籤清單的名稱、圖示與顏色；圖示與顏色會顯示在地圖的書籤上。
      </p>

      {error && (
        <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">{error}</div>
      )}

      {loading ? (
        <div className="py-10 text-center text-[13px] text-ink-3">載入中…</div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {lists.map((l) =>
            editor === l.id ? (
              <ListEditorCard
                key={l.id}
                name={draftName}
                setName={setDraftName}
                icon={draftIcon}
                setIcon={setDraftIcon}
                color={draftColor}
                setColor={setDraftColor}
                busy={busy}
                saveLabel="儲存"
                onSave={() => void saveEdit(l)}
                onCancel={() => setEditor(null)}
              />
            ) : (
              <div key={l.id} className="flex items-center gap-3 rounded-lg bg-surface p-[12px] shadow-1">
                <ListChip icon={safeListIcon(l.icon)} color={l.color || DEFAULT_LIST_COLOR} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{l.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openEdit(l)}
                  aria-label="編輯清單"
                  className="flex h-8 w-8 items-center justify-center text-ink-3 active:scale-90 disabled:opacity-50"
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void doDelete(l)}
                  aria-label="刪除清單"
                  className="flex h-8 w-8 items-center justify-center text-ink-3 active:scale-90 disabled:opacity-50"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ),
          )}

          {editor === 'add' ? (
            <ListEditorCard
              name={draftName}
              setName={setDraftName}
              icon={draftIcon}
              setIcon={setDraftIcon}
              color={draftColor}
              setColor={setDraftColor}
              busy={busy}
              saveLabel="新增"
              onSave={() => void saveAdd()}
              onCancel={() => setEditor(null)}
            />
          ) : (
            <button
              type="button"
              onClick={openAdd}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary-soft py-[14px] font-bold text-primary-deep active:scale-[0.99]"
              style={{ border: '1.5px dashed var(--primary)' }}
            >
              <Icon name="plus" size={18} /> 新增清單
            </button>
          )}

          {lists.length === 0 && editor !== 'add' && (
            <p className="mt-1 text-center text-[12.5px] text-ink-3">
              還沒有清單。在地圖加入書籤時選/新增清單，或在這裡新增。
            </p>
          )}
        </div>
      )}
    </>
  )
}

// 清單圖示徽章（圓底套清單色 + 白色 icon），同時是地圖 marker 的外觀預覽
function ListChip({ icon, color, size = 34 }: { icon: IconName; color: string; size?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full text-white"
      style={{ width: size, height: size, background: color }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} fill />
    </span>
  )
}

// 清單編輯器（新增 / 編輯共用）：預覽 + 名稱 + 圖示格 + 色票
function ListEditorCard({
  name,
  setName,
  icon,
  setIcon,
  color,
  setColor,
  busy,
  saveLabel,
  onSave,
  onCancel,
}: {
  name: string
  setName: Dispatch<SetStateAction<string>>
  icon: IconName
  setIcon: Dispatch<SetStateAction<IconName>>
  color: string
  setColor: Dispatch<SetStateAction<string>>
  busy: boolean
  saveLabel: string
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-lg bg-surface p-[14px] shadow-1">
      <div className="mb-3 flex items-center gap-3">
        <ListChip icon={icon} color={color} size={38} />
        <input
          autoFocus
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            } else if (e.key === 'Escape') {
              onCancel()
            }
          }}
          placeholder="清單名稱，例如：美食、夜景"
          className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface-2 px-3 py-[8px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
        />
      </div>

      <div className="mb-1 text-[12px] font-bold text-ink-3">圖示</div>
      <div className="mb-3 flex flex-wrap gap-[6px]">
        {LIST_ICONS.map((ic) => (
          <button
            key={ic}
            type="button"
            disabled={busy}
            onClick={() => setIcon(ic)}
            aria-label={`圖示 ${ic}`}
            className={`flex h-9 w-9 items-center justify-center rounded-[10px] border transition ${
              icon === ic ? 'border-primary bg-primary-soft text-primary-deep' : 'border-line text-ink-3'
            }`}
          >
            <Icon name={ic} size={18} />
          </button>
        ))}
      </div>

      <div className="mb-1 text-[12px] font-bold text-ink-3">顏色</div>
      <div className="mb-3 flex flex-wrap gap-[8px]">
        {LIST_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy}
            onClick={() => setColor(c)}
            aria-label={`顏色 ${c}`}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: c, outline: color === c ? '2.5px solid var(--ink)' : 'none', outlineOffset: 2 }}
          >
            {color === c && <Icon name="check" size={16} className="text-white" />}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={onSave}
          className="flex-1 rounded-md bg-primary px-3 py-[9px] text-[13.5px] font-bold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-md px-4 py-[9px] text-[13.5px] font-bold text-ink-3"
        >
          取消
        </button>
      </div>
    </div>
  )
}
