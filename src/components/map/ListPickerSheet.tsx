import { useMemo, useState } from 'react'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import Icon from '../Icon'
import { errMessage } from '../../lib/errMessage'

// 預設清單（功能 2：Google 地圖式，存書籤時至少進「想去」）
export const DEFAULT_LIST = '想去'

interface ListPickerSheetProps {
  placeName: string
  knownLists: string[] // 全趟用過的清單，供快速選用
  onClose: () => void
  onConfirm: (lists: string[]) => Promise<void> // 成功由父層關閉；失敗於此頁顯示
}

// 存書籤時選/新增清單（像 Google 地圖「儲存到清單」）：可複選既有清單、可當場新增、預設勾「想去」。
export default function ListPickerSheet({
  placeName,
  knownLists,
  onClose,
  onConfirm,
}: ListPickerSheetProps) {
  const [extra, setExtra] = useState<string[]>([]) // 本次新增的清單
  const [selected, setSelected] = useState<Set<string>>(new Set([DEFAULT_LIST]))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 顯示清單 = 「想去」∪ 既有 ∪ 本次新增（去重、保序）
  const lists = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const t of [DEFAULT_LIST, ...knownLists, ...extra]) {
      if (!seen.has(t)) {
        seen.add(t)
        out.push(t)
      }
    }
    return out
  }, [knownLists, extra])

  function toggle(t: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function addNew() {
    const t = draft.trim()
    if (!t) return
    if (!lists.includes(t)) setExtra((e) => [...e, t])
    setSelected((prev) => new Set(prev).add(t))
    setDraft('')
  }

  async function confirm() {
    const chosen = lists.filter((t) => selected.has(t))
    const finalLists = chosen.length > 0 ? chosen : [DEFAULT_LIST]
    setBusy(true)
    setError(null)
    try {
      await onConfirm(finalLists) // 成功後父層清掉 pending → 本頁卸載
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex min-h-0 flex-col px-[22px] pb-[30px] pt-2">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">加入清單</h2>
            <p className="mt-[2px] truncate text-[13px] text-ink-3">{placeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 flex-none items-center justify-center text-ink-3"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          <div className="flex flex-wrap gap-2">
            {lists.map((t) => {
              const on = selected.has(t)
              return (
                <button
                  key={t}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(t)}
                  className={`inline-flex items-center gap-[6px] rounded-full px-[14px] py-[8px] text-[13.5px] font-bold transition disabled:opacity-60 ${
                    on ? 'bg-primary text-white' : 'border border-line bg-surface-2 text-ink-2'
                  }`}
                >
                  <Icon name={on ? 'check' : 'bookmark'} size={14} />
                  {t}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addNew()
                }
              }}
              placeholder="新增清單，例如：美食、夜景"
              className="min-w-0 flex-1 rounded-[12px] border border-line-strong bg-surface-2 px-[14px] py-[10px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={addNew}
              className="flex-none rounded-[12px] bg-primary-soft px-4 py-[10px] text-[13.5px] font-bold text-primary-deep active:scale-95 disabled:opacity-50"
            >
              新增
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {error}
          </div>
        )}

        <div className="pt-3">
          <Button variant="primary" block disabled={busy} onClick={confirm}>
            <Icon name="heart" size={17} /> {busy ? '加入中…' : '加入書籤'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
