import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTripRealtime } from '../../lib/tripRealtime'
import {
  deleteTagAcrossTrip,
  listTripTags,
  renameTagAcrossTrip,
} from '../../lib/lists'
import { errMessage } from '../../lib/errMessage'
import Icon from '../../components/Icon'

// 畫面：設定分頁。目前提供「清單管理」（改名 / 刪除 / 合併書籤清單，功能 3）。
export default function SettingsTab() {
  const { tripId = '' } = useParams()
  const { ticks } = useTripRealtime()

  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState<string | null>(null) // 改名中的清單
  const [draft, setDraft] = useState('')
  const [mergeFrom, setMergeFrom] = useState<string | null>(null) // 合併來源

  const reload = useCallback(async () => {
    try {
      setTags(await listTripTags(tripId))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void reload()
  }, [reload])

  // items 變更（含他處改清單）→ 重載
  const itemsTick = ticks.items
  const firstTickRef = useRef(true)
  useEffect(() => {
    if (firstTickRef.current) {
      firstTickRef.current = false
      return
    }
    void reload()
  }, [itemsTick, reload])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await reload()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function startRename(tag: string) {
    setMergeFrom(null)
    setEditing(tag)
    setDraft(tag)
  }

  async function saveRename(from: string) {
    const to = draft.trim()
    setEditing(null)
    if (!to || to === from) return
    await run(() => renameTagAcrossTrip(tripId, from, to))
  }

  async function doDelete(tag: string) {
    if (!window.confirm(`刪除清單「${tag}」？會從所有景點移除這個清單標記（景點本身保留）。`)) return
    await run(() => deleteTagAcrossTrip(tripId, tag))
  }

  async function doMerge(from: string, to: string) {
    setMergeFrom(null)
    await run(() => renameTagAcrossTrip(tripId, from, to))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none px-4 pb-2 pt-3">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">設定</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[110px]">
        <h2 className="mb-1 mt-2 text-[15px] font-bold">清單管理</h2>
        <p className="mb-3 text-[12.5px] text-ink-3">改名、刪除或合併書籤清單；變更會套用到所有景點。</p>

        {error && (
          <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-[13px] text-ink-3">載入中…</div>
        ) : tags.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface-2 px-3 py-6 text-center text-[13px] leading-[1.5] text-ink-3">
            還沒有清單。在地圖加入書籤時選/新增清單即可。
          </div>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {tags.map((tag) => (
              <div key={tag} className="rounded-lg bg-surface p-[12px] shadow-1">
                {editing === tag ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={draft}
                      disabled={busy}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void saveRename(tag)
                        } else if (e.key === 'Escape') {
                          setEditing(null)
                        }
                      }}
                      className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface-2 px-3 py-[7px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveRename(tag)}
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
                    <span className="inline-flex flex-1 items-center gap-[6px] text-[15px] font-bold">
                      <Icon name="bookmark" size={15} className="text-primary-deep" />
                      {tag}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startRename(tag)}
                      aria-label="改名"
                      className="flex h-8 w-8 items-center justify-center text-ink-3 active:scale-90 disabled:opacity-50"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busy || tags.length < 2}
                      onClick={() => {
                        setEditing(null)
                        setMergeFrom((cur) => (cur === tag ? null : tag))
                      }}
                      aria-label="合併"
                      className="flex h-8 w-8 items-center justify-center text-ink-3 active:scale-90 disabled:opacity-30"
                    >
                      <Icon name="layers" size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void doDelete(tag)}
                      aria-label="刪除"
                      className="flex h-8 w-8 items-center justify-center text-ink-3 active:scale-90 disabled:opacity-50"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                )}

                {mergeFrom === tag && (
                  <div className="mt-[10px] border-t border-line pt-[10px]">
                    <div className="mb-2 text-[12.5px] font-semibold text-ink-3">把「{tag}」併入：</div>
                    <div className="flex flex-wrap gap-2">
                      {tags
                        .filter((t) => t !== tag)
                        .map((t) => (
                          <button
                            key={t}
                            type="button"
                            disabled={busy}
                            onClick={() => void doMerge(tag, t)}
                            className="rounded-full bg-primary-soft px-3 py-[6px] text-[12.5px] font-bold text-primary-deep active:scale-95 disabled:opacity-60"
                          >
                            {t}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
