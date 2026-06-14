import type { Document, TripMemberWithProfile } from '../../lib/types'
import Icon from '../Icon'
import Avatar from '../Avatar'
import { categoryIcon, categoryLabel } from './docMeta'

interface DocRowProps {
  doc: Document
  uploader: TripMemberWithProfile | undefined
  meId: string
  cached: boolean
  linkedCount: number // 連到幾個行程項目/交通（多對多）
  disabled?: boolean // 離線且未快取：灰階、仍可點開（動作頁會擋檢視）
  onClick: () => void
}

// 單列文件（對照 design_handoff 的 DocRow）：分類圖示 + 檔名 + 上傳者 + 快取/連結 chip。
export default function DocRow({
  doc,
  uploader,
  meId,
  cached,
  linkedCount,
  disabled = false,
  onClick,
}: DocRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg bg-surface p-3 text-left shadow-1 transition active:scale-[0.99]"
      style={disabled ? { opacity: 0.5, boxShadow: 'none', filter: 'grayscale(.6)' } : undefined}
    >
      <span className="flex h-[54px] w-[46px] flex-none items-center justify-center rounded-[11px] bg-primary-soft text-primary-deep">
        <Icon name={doc.kind === 'note' ? 'edit' : categoryIcon(doc.category)} size={22} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="break-words text-[14.5px] font-bold leading-[1.3]">{doc.file_name}</div>
        <div className="mt-[2px] text-[12.5px] font-semibold text-ink-3">
          {categoryLabel(doc.category)}
          {doc.kind === 'note' ? ' · 備忘錄' : ''}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-[6px]">
          <Avatar
            name={uploader?.profile?.display_name}
            avatarUrl={uploader?.profile?.avatar_url}
            partner={uploader ? uploader.user_id !== meId : false}
            size={20}
          />
          {/* 快取 chip 僅檔案需要；備忘錄內文隨列載入即離線可看 */}
          {doc.kind === 'file' &&
            (cached ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-[2px] text-[11px] font-bold text-[#1f8f6a]">
                <Icon name="cloud" size={12} /> 離線可用
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-line px-2 py-[2px] text-[11px] font-bold text-ink-2">
                <Icon name="cloudoff" size={12} /> 未快取
              </span>
            ))}
          {linkedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-[2px] text-[11px] font-bold text-primary-deep">
              <Icon name="link" size={12} /> 已連結 {linkedCount} 處
            </span>
          )}
        </div>
      </div>

      <span className="flex h-[26px] w-[26px] flex-none items-center justify-center text-ink-3">
        <Icon name="chevR" size={18} />
      </span>
    </button>
  )
}
