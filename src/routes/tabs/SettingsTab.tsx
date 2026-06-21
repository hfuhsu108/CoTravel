import { useState } from 'react'
import Icon, { type IconName } from '../../components/Icon'
import TripSettingsPanel from './settings/TripSettingsPanel'
import ListsPanel from './settings/ListsPanel'
import PackingCategoryPanel from './settings/PackingCategoryPanel'

// 畫面：設定分頁。iOS/Android 式「點選進入」的設定清單（之後好擴充更多列），取代上方頁籤切換。
type Section = 'menu' | 'trip' | 'lists' | 'packing'

const ROWS: { key: Exclude<Section, 'menu'>; label: string; sub: string; icon: IconName }[] = [
  { key: 'trip', label: '旅程設定', sub: '名稱、目的地、日期、邀請碼', icon: 'pin' },
  { key: 'lists', label: '景點清單', sub: '清單名稱、圖示與顏色', icon: 'bookmark' },
  { key: 'packing', label: '行李分類', sub: '管理你的行李分類', icon: 'bag' },
]
const TITLES: Record<Exclude<Section, 'menu'>, string> = {
  trip: '旅程設定',
  lists: '景點清單',
  packing: '行李分類',
}

export default function SettingsTab() {
  const [section, setSection] = useState<Section>('menu')

  if (section === 'menu') {
    return (
      <div className="flex h-full flex-col lg:mx-auto lg:w-full lg:max-w-[720px]">
        <div className="flex-none px-4 pb-2 pt-3">
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">設定</h1>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[110px] pt-2">
          <div className="overflow-hidden rounded-lg bg-surface shadow-1">
            {ROWS.map((r, i) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setSection(r.key)}
                className={`flex w-full items-center gap-3 px-[14px] py-[15px] text-left active:bg-surface-2 ${
                  i < ROWS.length - 1 ? 'border-b border-line' : ''
                }`}
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
                  <Icon name={r.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{r.label}</span>
                  <span className="block text-[12.5px] text-ink-3">{r.sub}</span>
                </span>
                <Icon name="chevR" size={18} className="flex-none text-ink-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col lg:mx-auto lg:w-full lg:max-w-[720px]">
      <div className="flex flex-none items-center gap-2 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={() => setSection('menu')}
          aria-label="返回設定"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 active:bg-surface-2"
        >
          <Icon name="back" size={20} />
        </button>
        <h1 className="text-[20px] font-bold">{TITLES[section]}</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[110px] pt-1">
        {section === 'trip' && <TripSettingsPanel />}
        {section === 'lists' && <ListsPanel />}
        {section === 'packing' && <PackingCategoryPanel />}
      </div>
    </div>
  )
}
