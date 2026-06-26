import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AreaCandidate, Day, Document, Item, TripMemberWithProfile } from '../../../lib/types'
import { displayName, type ItemPatch } from '../../../lib/itinerary'
import type { EffTime } from '../../../lib/schedule'
import { listDocumentsByItem, listDocumentsByLodging } from '../../../lib/documents'
import Icon from '../../Icon'
import Avatar from '../../Avatar'
import DocLinkSheet from '../../docs/DocLinkSheet'
import PlaceDetail from './PlaceDetail'
import AreaDetail from './AreaDetail'

interface DetailSheetProps {
  item: Item
  candidates: AreaCandidate[]
  days: Day[]
  members: TripMemberWithProfile[]
  meId: string
  stationLabel: string | null
  tripTz: string | null // 旅程主時區（功能 5：與地點時區不同時，造訪時間附時區標籤）
  effTime: EffTime | null // 有效三時間（功能 4；可能為 null，如書籤或非當天）
  warnings: string[] // 此項目的時間防呆警告（功能 8）
  onClose: () => void
  onUpdate: (patch: ItemPatch) => Promise<void>
  onRemove: () => Promise<void>
  onDuplicate: () => Promise<void>
  onMoveDay: (dayId: string) => Promise<void>
  onToggleCandidate: (c: AreaCandidate) => Promise<void>
  onRemoveCandidate: (id: string) => Promise<void>
  onAddCandidate: () => void
}

// 由右滑入的全頁詳情（畫面 3）。hero + 返回 + 右上「誰加的」頭像；內文依 type 分定點/區域。
// 交通詳情（TransitDetail）屬階段 3，本階段不含。
export default function DetailSheet({
  item,
  candidates,
  days,
  members,
  meId,
  stationLabel,
  tripTz,
  effTime,
  warnings,
  onClose,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveDay,
  onToggleCandidate,
  onRemoveCandidate,
  onAddCandidate,
}: DetailSheetProps) {
  const { tripId = '' } = useParams()
  const author = members.find((m) => m.user_id === item.created_by)
  const isArea = item.type === 'area'

  // 反向取此項目已連結的文件（詳情頁顯示）。換項目時重抓；失敗不擋詳情其餘內容。
  const [linkedDocs, setLinkedDocs] = useState<Document[]>([])
  const [manageOpen, setManageOpen] = useState(false)

  // 住宿項目（lodging_id 非 null）的文件掛在「住宿」層級：所有住宿日共用、後續新增的文件自動出現，
  // 且改入住/退房日重建項目時不流失。其餘項目維持 item 層級連結。
  const lodgingId = item.lodging_id

  // 手動重抓（管理連結變動後呼叫）；元件仍掛載故不需 active 守衛
  async function refreshLinked() {
    try {
      setLinkedDocs(
        await (lodgingId ? listDocumentsByLodging(lodgingId) : listDocumentsByItem(item.id)),
      )
    } catch (e) {
      console.warn('[DetailSheet] 連結文件載入失敗', e)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const docs = await (lodgingId
          ? listDocumentsByLodging(lodgingId)
          : listDocumentsByItem(item.id))
        if (active) setLinkedDocs(docs)
      } catch (e) {
        console.warn('[DetailSheet] 連結文件載入失敗', e)
      }
    })()
    return () => {
      active = false
    }
  }, [item.id, lodgingId])

  return (
    <div className="absolute inset-0 z-[72] flex flex-col bg-bg animate-slideleft">
      <div className="relative flex-none">
        {item.photo_url && !isArea ? (
          <img src={item.photo_url} alt={displayName(item)} className="h-[210px] w-full object-cover" />
        ) : (
          <div className={`ph flex h-[210px] items-center justify-center ${isArea ? 'ph-warm' : ''}`}>
            {isArea ? (
              <div
                className="h-[110px] w-[110px] rounded-full"
                style={{ border: '2.5px dashed var(--primary)', background: 'rgba(122,108,240,.12)' }}
              />
            ) : (
              <span className="ph-label">{displayName(item)}</span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="返回"
          className="absolute left-[14px] flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/90 text-ink-2 shadow-1 active:scale-95"
          style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
        >
          <Icon name="back" size={20} />
        </button>

        {author && (
          <div
            className="absolute right-[14px]"
            style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
          >
            <Avatar
              name={author.profile?.display_name}
              avatarUrl={author.profile?.avatar_url}
              partner={author.user_id !== meId}
              size={30}
              ring
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-[18px]">
        {isArea ? (
          <AreaDetail
            item={item}
            candidates={candidates}
            days={days}
            linkedDocs={linkedDocs}
            onManageDocs={() => setManageOpen(true)}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onMoveDay={onMoveDay}
            onToggleCandidate={onToggleCandidate}
            onRemoveCandidate={onRemoveCandidate}
            onAddCandidate={onAddCandidate}
          />
        ) : (
          <PlaceDetail
            item={item}
            stationLabel={stationLabel}
            days={days}
            tripTz={tripTz}
            effTime={effTime}
            warnings={warnings}
            linkedDocs={linkedDocs}
            meId={meId}
            onManageDocs={() => setManageOpen(true)}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            onMoveDay={onMoveDay}
          />
        )}
      </div>

      {manageOpen && (
        <DocLinkSheet
          tripId={tripId}
          targetKind={lodgingId ? 'lodging' : 'item'}
          targetId={lodgingId ?? item.id}
          onChanged={refreshLinked}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  )
}
