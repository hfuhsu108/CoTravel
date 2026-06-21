import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../../lib/auth'
import { useTripRealtime } from '../../../lib/tripRealtime'
import {
  addCategory,
  ensureDefaultCategories,
  listCategories,
  removeCategory,
  renameCategory,
} from '../../../lib/packingCategories'
import { errMessage } from '../../../lib/errMessage'
import type { PackingCategory } from '../../../lib/types'
import Icon from '../../../components/Icon'

// 設定→行李分類：管理「我自己」的行李分類（各自管理）。行李清單的分類下拉即取自這裡。
export default function PackingCategoryPanel() {
  const { tripId = '' } = useParams()
  const { user } = useAuth()
  const meId = user?.id ?? ''
  const { ticks } = useTripRealtime()

  const [cats, setCats] = useState<PackingCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [newName, setNewName] = useState('')

  const reload = useCallback(async () => {
    try {
      setCats(await ensureDefaultCategories(tripId, meId))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [tripId, meId])

  useEffect(() => {
    void reload()
  }, [reload])

  // 分類他處變更（多裝置）→ 重載（不重建預設，避免寫入迴圈）
  const catTick = ticks.packing_categories
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    listCategories(tripId, meId)
      .then(setCats)
      .catch((e) => console.warn('[packingCategories] 即時刷新失敗', e))
  }, [catTick, tripId, meId])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      setCats(await listCategories(tripId, meId))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function addNew() {
    const name = newName.trim()
    if (!name) return
    if (cats.some((c) => c.name === name)) {
      setError('已有同名分類')
      return
    }
    const sort = cats.length ? Math.max(...cats.map((c) => c.sort_order)) + 1 : 0
    await run(async () => {
      await addCategory(tripId, meId, name, sort)
    })
    setNewName('')
  }

  async function saveRename(c: PackingCategory) {
    const name = draft.trim()
    setEditing(null)
    if (!name || name === c.name) return
    if (cats.some((x) => x.id !== c.id && x.name === name)) {
      setError('已有同名分類')
      return
    }
    await run(() => renameCategory(c.id, name))
  }

  async function doDelete(c: PackingCategory) {
    if (!window.confirm(`刪除分類「${c.name}」？這個分類的行李會變成「未分類」（行李本身保留）。`)) return
    await run(() => removeCategory(c.id))
  }

  return (
    <>
      <p className="mb-3 text-[12.5px] text-ink-3">
        管理你自己的行李分類；新增行李時的分類下拉即取自這裡。
      </p>

      {error && (
        <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">{error}</div>
      )}

      {loading ? (
        <div className="py-10 text-center text-[13px] text-ink-3">載入中…</div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {cats.map((c) => (
            <div key={c.id} className="rounded-lg bg-surface p-[12px] shadow-1">
              {editing === c.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draft}
                    disabled={busy}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void saveRename(c)
                      } else if (e.key === 'Escape') {
                        setEditing(null)
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface-2 px-3 py-[7px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveRename(c)}
                    className="flex-none rounded-md bg-primary px-3 py-[7px] text-[13px] font-bold text-white active:scale-95 disabled:opacity-60"
                  >
                    儲存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="flex-none rounded-md px-2 py-[7px] text-[13px] font-bold text-ink-3"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex flex-1 items-center gap-[8px] text-[15px] font-bold">
                    <Icon name="bag" size={15} className="text-primary-deep" />
                    {c.name}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setError(null)
                      setEditing(c.id)
                      setDraft(c.name)
                    }}
                    aria-label="改名"
                    className="flex h-8 w-8 items-center justify-center text-ink-3 active:scale-90 disabled:opacity-50"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void doDelete(c)}
                    aria-label="刪除"
                    className="flex h-8 w-8 items-center justify-center text-ink-3 active:scale-90 disabled:opacity-50"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* 新增分類 */}
          <div className="mt-1 flex items-center gap-2">
            <input
              value={newName}
              disabled={busy}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addNew()
                }
              }}
              placeholder="新增分類，例如：藥品、嬰兒用品"
              className="min-w-0 flex-1 rounded-[12px] border border-line-strong bg-surface-2 px-[14px] py-[10px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
            />
            <button
              type="button"
              disabled={busy || !newName.trim()}
              onClick={() => void addNew()}
              className="flex-none rounded-[12px] bg-primary-soft px-4 py-[10px] text-[13.5px] font-bold text-primary-deep active:scale-95 disabled:opacity-50"
            >
              新增
            </button>
          </div>
        </div>
      )}
    </>
  )
}
