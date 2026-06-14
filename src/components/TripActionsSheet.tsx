import { useState } from 'react'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Icon, { type IconName } from './Icon'
import InviteCodeCard from './InviteCodeCard'
import { deleteTrip } from '../lib/api'
import { errMessage } from '../lib/errMessage'
import type { TripWithMembers } from '../lib/types'

interface TripActionsSheetProps {
  trip: TripWithMembers
  meId: string
  onClose: () => void
  onEdit: (trip: TripWithMembers) => void
  onDeleted: (tripId: string) => void
}

type View = 'menu' | 'code' | 'confirmDelete'

// 行程卡三點選單：顯示邀請碼 / 修改行程 / 刪除行程。
// 修改、刪除僅建立者可見（對齊 RLS「creator update/delete trips」）；刪除走二次確認（資料不可逆）。
export default function TripActionsSheet({
  trip,
  meId,
  onClose,
  onEdit,
  onDeleted,
}: TripActionsSheetProps) {
  const [view, setView] = useState<View>('menu')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const isOwner = trip.created_by === meId

  async function handleDelete() {
    setBusy(true)
    setErr(null)
    try {
      await deleteTrip(trip.id)
      onDeleted(trip.id)
    } catch (e) {
      setErr(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="px-[22px] pb-[34px] pt-2">
        {view === 'menu' && (
          <>
            <h2 className="mb-1 text-xl font-bold">{trip.name}</h2>
            <p className="mb-4 text-[13px] text-ink-3">選擇要進行的操作</p>
            <div className="flex flex-col gap-3">
              <MenuRow
                icon="link"
                title="顯示邀請碼"
                subtitle="分享給另一半一起共編"
                onClick={() => setView('code')}
              />
              {isOwner && (
                <MenuRow
                  icon="edit"
                  title="修改行程"
                  subtitle="名稱、目的地、日期"
                  onClick={() => onEdit(trip)}
                />
              )}
              {isOwner && (
                <MenuRow
                  icon="trash"
                  title="刪除行程"
                  subtitle="連同行程、文件一併移除"
                  danger
                  onClick={() => setView('confirmDelete')}
                />
              )}
            </div>
          </>
        )}

        {view === 'code' && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('menu')}
                aria-label="返回"
                className="flex h-8 w-8 items-center justify-center text-ink-3"
              >
                <Icon name="back" size={20} />
              </button>
              <h2 className="text-xl font-bold">邀請碼</h2>
            </div>
            <p className="mb-4 text-sm leading-[1.5] text-ink-2">
              把這組邀請碼傳給另一半，對方在「用邀請碼加入」輸入後即可一起編「{trip.name}」。
            </p>
            <div className="my-2 mb-2">
              <InviteCodeCard code={trip.invite_code} />
            </div>
          </>
        )}

        {view === 'confirmDelete' && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('menu')}
                aria-label="返回"
                className="flex h-8 w-8 items-center justify-center text-ink-3"
              >
                <Icon name="back" size={20} />
              </button>
              <h2 className="text-xl font-bold text-danger">刪除「{trip.name}」？</h2>
            </div>
            <p className="mb-5 text-sm leading-[1.6] text-ink-2">
              這會永久刪除整趟行程、地圖項目、交通、文件與行李清單，且無法復原。夥伴也將失去存取。
            </p>
            {err && <p className="mb-3 text-[13px] text-danger">{err}</p>}
            <div className="flex flex-col gap-2">
              <Button variant="dark" block disabled={busy} onClick={handleDelete} className="!bg-danger">
                <Icon name="trash" size={18} /> {busy ? '刪除中…' : '確定刪除'}
              </Button>
              <Button variant="plain" block disabled={busy} onClick={() => setView('menu')}>
                取消
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

function MenuRow({
  icon,
  title,
  subtitle,
  danger = false,
  onClick,
}: {
  icon: IconName
  title: string
  subtitle: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-1 active:scale-[0.99]"
    >
      <span
        className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px]"
        style={
          danger
            ? { background: '#ffeef0', color: 'var(--danger)' }
            : { background: 'var(--primary-soft)', color: 'var(--primary-deep)' }
        }
      >
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div className={`text-[15px] font-bold ${danger ? 'text-danger' : ''}`}>{title}</div>
        <div className="text-[12.5px] text-ink-3">{subtitle}</div>
      </div>
    </button>
  )
}
