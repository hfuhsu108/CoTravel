import { useState } from 'react'
import Icon from '../../Icon'

interface TagEditorProps {
  tags: string[]
  busy?: boolean
  onChange: (tags: string[]) => void // 變更後直接持久化（呼叫端存 DB）
}

// 多標籤編輯器（功能 2）：自由輸入、Enter/逗號新增、chip 上 × 移除。去重、去空白。
export default function TagEditor({ tags, busy = false, onChange }: TagEditorProps) {
  const [draft, setDraft] = useState('')

  function addTag() {
    const t = draft.trim()
    if (!t) return
    if (!tags.includes(t)) onChange([...tags, t])
    setDraft('')
  }

  function removeTag(t: string) {
    onChange(tags.filter((x) => x !== t))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-line px-[10px] py-[4px] text-[12.5px] font-bold text-ink-2"
        >
          {t}
          <button
            type="button"
            disabled={busy}
            onClick={() => removeTag(t)}
            aria-label={`從清單移除 ${t}`}
            className="flex items-center text-ink-3 active:scale-90 disabled:opacity-50"
          >
            <Icon name="x" size={13} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
          }
        }}
        onBlur={addTag}
        placeholder="加入清單…"
        className="min-w-[88px] flex-1 rounded-full border border-line-strong bg-surface-2 px-[12px] py-[5px] text-[12.5px] text-ink outline-none focus:border-primary focus:bg-white"
      />
    </div>
  )
}
