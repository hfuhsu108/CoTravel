import { useState, type FormEvent } from 'react'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import Field, { inputClassName } from '../ui/Field'
import Icon from '../Icon'
import type { PackingCategory } from '../../lib/types'
import { errMessage } from '../../lib/errMessage'

interface AddPackSheetProps {
  categories: PackingCategory[] // 我的分類（下拉來源；於「設定→行李分類」管理）
  onAdd: (name: string, categoryId: string | null) => Promise<void>
  onClose: () => void
}

// 畫面 5 的「新增行李項目」sheet：品名 + 分類（下拉，來源為各自管理的分類），Enter 可送出
export default function AddPackSheet({ categories, onAdd, onClose }: AddPackSheetProps) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)
    try {
      await onAdd(trimmed, categoryId || null)
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
      <form className="min-h-0 overflow-y-auto px-[22px] pt-4" onSubmit={handleSubmit}>
        <Field label="品名">
          <input
            className={inputClassName}
            placeholder="例如：太陽眼鏡"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="分類">
          {categories.length === 0 ? (
            <p className="rounded-[13px] border-[1.5px] border-line-strong bg-surface-2 px-[14px] py-[12px] text-[13px] leading-[1.5] text-ink-3">
              還沒有分類。請到「設定 → 行李分類」新增分類後再來。
            </p>
          ) : (
            <select
              className={inputClassName}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
        <Button type="submit" block disabled={!name.trim() || saving}>
          <Icon name="plus" size={18} /> {saving ? '加入中…' : '加入清單'}
        </Button>
      </form>
    </Sheet>
  )
}
