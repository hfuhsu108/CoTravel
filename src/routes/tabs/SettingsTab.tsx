import { useState } from 'react'
import { DateTime } from 'luxon'
import Icon, { type IconName } from '../../components/Icon'
import { usePwa } from '../../lib/pwa/PwaProvider'
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

// 「關於與更新」用的列：有 onClick 才是按鈕（其餘為純資訊列，無點擊回饋）
function AboutRow({
  icon,
  label,
  sub,
  onClick,
  accent,
  last,
}: {
  icon: IconName
  label: string
  sub: string
  onClick?: () => void
  accent?: boolean
  last?: boolean
}) {
  const cls = `flex w-full items-center gap-3 px-[14px] py-[15px] text-left ${
    last ? '' : 'border-b border-line'
  } ${onClick ? 'active:bg-surface-2' : ''}`
  const body = (
    <>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-bold ${accent ? 'text-primary-deep' : ''}`}>
          {label}
        </span>
        <span className="block text-[12.5px] text-ink-3">{sub}</span>
      </span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

// build 時間以 ISO（UTC）注入，顯示時轉本地時區
function formatBuiltAt(iso: string): string {
  const dt = DateTime.fromISO(iso)
  return dt.isValid ? dt.toFormat('yyyy-LL-dd HH:mm') : iso
}

export default function SettingsTab() {
  const [section, setSection] = useState<Section>('menu')
  const pwa = usePwa()

  if (section === 'menu') {
    // 檢查更新列：依狀態變換標籤與動作（available 時整列改為「立即更新」）
    const update: { label: string; sub: string; onClick?: () => void } =
      pwa.checkResult === 'checking'
        ? { label: '檢查更新', sub: '檢查中…' }
        : pwa.checkResult === 'available'
          ? { label: '有新版本可用', sub: '點此立即更新並重新載入', onClick: pwa.applyUpdate }
          : pwa.checkResult === 'latest'
            ? { label: '檢查更新', sub: '已是最新版本', onClick: () => void pwa.checkForUpdate() }
            : pwa.checkResult === 'error'
              ? { label: '檢查更新', sub: '暫時無法檢查，請稍後再試', onClick: () => void pwa.checkForUpdate() }
              : { label: '檢查更新', sub: '看看有沒有新版本', onClick: () => void pwa.checkForUpdate() }

    // 安裝列：可安裝→按鈕；已安裝/iOS/不支援→純提示
    const install: { sub: string; onClick?: () => void } = pwa.installed
      ? { sub: '已安裝，可從主畫面開啟' }
      : pwa.canInstall
        ? { sub: '加到主畫面，啟動更快', onClick: () => void pwa.promptInstall() }
        : pwa.isIOS
          ? { sub: '用 Safari「分享」→「加入主畫面」' }
          : { sub: '可從瀏覽器選單選「安裝／加入主畫面」' }

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

          {/* 關於與更新：版本、檢查更新（手動套用）、安裝為應用程式 */}
          <div className="mt-3 overflow-hidden rounded-lg bg-surface shadow-1">
            <AboutRow
              icon="info"
              label="關於同行"
              sub={`版本 ${pwa.version} · ${formatBuiltAt(pwa.builtAt)}`}
            />
            <AboutRow
              icon="refresh"
              label={update.label}
              sub={update.sub}
              accent={pwa.checkResult === 'available'}
              onClick={update.onClick}
            />
            <AboutRow
              icon="download"
              label="安裝為應用程式"
              sub={install.sub}
              onClick={install.onClick}
              last
            />
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
