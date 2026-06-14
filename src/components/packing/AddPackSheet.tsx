import { useState, type FormEvent } from 'react'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import Field, { inputClassName } from '../ui/Field'
import Icon from '../Icon'
import { PACK_CATEGORIES } from '../../lib/packing'
import { errMessage } from '../../lib/errMessage'

interface AddPackSheetProps {
  suggestions: string[] // 分類建議（預設 ∪ 本人已用過；功能 6 可自定義）
  onAdd: (name: string, category: string) => Promise<void>
  onClose: () => void
}

// 畫面 5 的「新增行李項目」sheet：品名 + 分類（可選建議或自行輸入），Enter 可送出
export default function AddPackSheet({ suggestions, onAdd, onClose }: AddPackSheetProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(PACK_CATEGORIES[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)
    try {
      await onAdd(trimmed, category.trim() || '其他')
      onClose()
    } catch (err) {
      setError(errMessage(err))
      setSaving(false)
    }
  }

  return (
    <Sheet onClose={onClose} className="pb-[34px]">
      <div className="flex items-center justify-between px-[22px] pt-[6px]">
        <h2 className="text-xl font-bold">新增行李項目</h2>
        <button type="button" onClick={onClose} aria-label="關閉" className="text-ink-2">
          <Icon name="x" size={20} />
        </button>
      </div>
      <form className="px-[22px] pt-4" onSubmit={handleSubmit}>
        <Field label="品名">
          <input
            className={inputClassName}
            placeholder="例如：太陽眼鏡"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="分類（可選建議或自行輸入）">
          <input
            className={inputClassName}
            list="pack-category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="例如：證件、藥品、嬰兒用品"
          />
          <datalist id="pack-category-suggestions">
            {suggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
        <Button type="submit" block disabled={!name.trim() || saving}>
          <Icon name="plus" size={18} /> {saving ? '加入中…' : '加入清單'}
        </Button>
      </form>
    </Sheet>
  )
}
