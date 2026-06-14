import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useTripRealtime } from '../../lib/tripRealtime'
import {
  PACK_CATEGORIES,
  addPackingItem,
  listPackingItems,
  removePackingItem,
  setPackingPacked,
} from '../../lib/packing'
import { errMessage } from '../../lib/errMessage'
import type { PackingItem } from '../../lib/types'
import Icon from '../../components/Icon'
import Avatar from '../../components/Avatar'
import AddPackSheet from '../../components/packing/AddPackSheet'

// 畫面 5 行李清單：依個人分的清單 + 勾選 + 完成度。兩人互看，對方唯讀（UI 擋 + RLS 擋）。
// 行李變動不寫 activity_log（勾選高頻會洗版），靠 Realtime tick 即時同步對方進度。
export default function PackingTab() {
  const { tripId = '' } = useParams()
  const { user } = useAuth()
  const meId = user?.id ?? ''
  const { members, ticks } = useTripRealtime()

  const me = members.find((m) => m.user_id === meId)
  const partner = members.find((m) => m.user_id !== meId)

  const [who, setWho] = useState<'me' | 'partner'>('me')
  const [list, setList] = useState<PackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listPackingItems(tripId)
      .then((rows) => {
        if (active) setList(rows)
      })
      .catch((e) => {
        if (active) setError(errMessage(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tripId])

  // Realtime：packing_items 變更（多半是對方勾選/增刪）→ 靜默 refetch，不閃 loading
  const packTick = ticks.packing_items
  const firstTickRef = useRef(true)
  useEffect(() => {
    if (firstTickRef.current) {
      firstTickRef.current = false
      return
    }
    listPackingItems(tripId)
      .then(setList)
      .catch((e) => console.warn('[packing] 即時刷新失敗', e))
  }, [packTick, tripId])

  const mine = who === 'me'
  const viewedUserId = mine ? meId : (partner?.user_id ?? '')
  const viewed = useMemo(
    () => list.filter((p) => p.owner_user_id === viewedUserId),
    [list, viewedUserId],
  )
  // 動態分組（功能 6：分類可自定義）：預設分類依固定順序在前、自訂分類其後（依字母）、「其他」殿後
  const groups = useMemo(() => {
    const byCat = new Map<string, PackingItem[]>()
    for (const p of viewed) {
      const cat = p.category?.trim() || '其他'
      const arr = byCat.get(cat) ?? []
      arr.push(p)
      byCat.set(cat, arr)
    }
    const defaultsPresent = PACK_CATEGORIES.filter((c) => c !== '其他' && byCat.has(c))
    const customs = [...byCat.keys()]
      .filter((c) => c !== '其他' && !(PACK_CATEGORIES as readonly string[]).includes(c))
      .sort((a, b) => a.localeCompare(b))
    const ordered = [...defaultsPresent, ...customs]
    if (byCat.has('其他')) ordered.push('其他')
    return ordered.map((cat) => ({ cat, items: byCat.get(cat) ?? [] }))
  }, [viewed])

  // 新增時的分類建議：預設分類 ∪ 本人已用過的分類
  const categorySuggestions = useMemo(() => {
    const s = new Set<string>(PACK_CATEGORIES)
    for (const p of list) {
      if (p.owner_user_id === meId && p.category?.trim()) s.add(p.category.trim())
    }
    return [...s]
  }, [list, meId])

  const total = viewed.length
  const done = viewed.filter((p) => p.is_packed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const partnerName = partner?.profile?.display_name ?? '夥伴'

  async function handleToggle(item: PackingItem) {
    if (!mine) return
    const next = !item.is_packed
    setList((ls) => ls.map((p) => (p.id === item.id ? { ...p, is_packed: next } : p)))
    try {
      await setPackingPacked(item.id, next)
    } catch (e) {
      setList((ls) => ls.map((p) => (p.id === item.id ? { ...p, is_packed: !next } : p)))
      setError(errMessage(e))
    }
  }

  async function handleRemove(item: PackingItem) {
    const prev = list
    setList((ls) => ls.filter((p) => p.id !== item.id))
    try {
      await removePackingItem(item.id)
    } catch (e) {
      setList(prev)
      setError(errMessage(e))
    }
  }

  async function handleAdd(name: string, category: string) {
    const created = await addPackingItem({
      trip_id: tripId,
      owner_user_id: meId,
      name,
      category,
    })
    setList((ls) => [...ls, created])
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-ink-3">載入中…</div>
  }

  return (
    <div className="flex h-full flex-col">
      {/* appbar：標題 + 兩人頭像 */}
      <div className="flex flex-none items-center justify-between px-4 pb-[10px] pt-3">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">行李清單</h1>
        <div className="flex">
          <Avatar
            name={me?.profile?.display_name}
            avatarUrl={me?.profile?.avatar_url}
            size={32}
            ring
            online
          />
          {partner && (
            <Avatar
              name={partner.profile?.display_name}
              avatarUrl={partner.profile?.avatar_url}
              partner
              size={32}
              ring
              online
              className="-ml-[9px]"
            />
          )}
        </div>
      </div>

      {/* 兩人分頁（單人旅程不顯示） */}
      {partner && (
        <div className="flex-none px-4 pb-3">
          <div className="flex gap-1 rounded-[14px] bg-line p-1">
            <button
              type="button"
              onClick={() => setWho('me')}
              className={`flex-1 rounded-[11px] px-2 py-[9px] text-[14px] font-bold transition ${
                mine ? 'bg-surface text-primary-deep shadow-1' : 'text-ink-2'
              }`}
            >
              我的行李
            </button>
            <button
              type="button"
              onClick={() => setWho('partner')}
              className={`flex-1 rounded-[11px] px-2 py-[9px] text-[14px] font-bold transition ${
                !mine ? 'bg-surface text-primary-deep shadow-1' : 'text-ink-2'
              }`}
            >
              {partnerName}的行李
            </button>
          </div>
        </div>
      )}

      {/* 進度卡 */}
      <div className="flex-none px-4 pb-3">
        <div className="rounded-lg bg-surface px-4 py-[14px] shadow-1">
          <div className="mb-[9px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                name={mine ? me?.profile?.display_name : partner?.profile?.display_name}
                avatarUrl={mine ? me?.profile?.avatar_url : partner?.profile?.avatar_url}
                partner={!mine}
                size={26}
              />
              <span className="text-[14px] font-bold">
                {mine ? '已打包進度' : `${partnerName}的進度`}
              </span>
              {!mine && (
                <span className="rounded-full bg-line px-[9px] py-[3px] text-[11px] font-bold text-ink-2">
                  唯讀
                </span>
              )}
            </div>
            <span className="num whitespace-nowrap text-[15px] font-extrabold text-primary-deep">
              {done}/{total} 已打包
            </span>
          </div>
          <div className="h-[9px] overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-[width] duration-[400ms]"
              style={{
                width: `${pct}%`,
                background: mine
                  ? 'linear-gradient(90deg, var(--primary), #9b8cf6)'
                  : 'linear-gradient(90deg, var(--pink), #f4a9c2)',
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex-none px-4 pb-2 text-center text-[13px] text-danger">{error}</div>
      )}

      {/* 分類分組清單 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[110px] pt-[2px]">
        {viewed.length === 0 ? (
          <div className="px-5 py-10 text-center text-[14px] leading-[1.6] text-ink-3">
            {mine ? (
              <>
                還沒有行李，
                <br />
                按右下角「＋」新增第一項。
              </>
            ) : (
              `${partnerName} 還沒有建立行李清單`
            )}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.cat} className="mb-[18px]">
              <div className="mx-1 mb-[9px] mt-1 font-round text-xs font-bold uppercase tracking-[0.14em] text-ink-3">
                {g.cat}
              </div>
              <div className="rounded-lg bg-surface px-[14px] py-1 shadow-1">
                {g.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-[13px] py-[13px] ${
                      idx < g.items.length - 1 ? 'border-b border-line' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      aria-label={item.is_packed ? '取消打包' : '標記已打包'}
                      disabled={!mine}
                      className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] border-2 transition ${
                        item.is_packed
                          ? mine
                            ? 'border-primary bg-primary text-white'
                            : 'border-pink bg-pink text-white opacity-[0.85]'
                          : `border-line-strong bg-surface ${mine ? '' : 'opacity-[0.85]'}`
                      } ${mine ? '' : 'cursor-default'}`}
                    >
                      {item.is_packed && <Icon name="check" size={15} />}
                    </button>
                    <span
                      className={`flex-1 text-[15px] font-semibold ${
                        item.is_packed
                          ? 'text-ink-3 line-through [text-decoration-color:var(--ink-4)]'
                          : 'text-ink'
                      }`}
                    >
                      {item.name}
                    </span>
                    {mine && (
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        aria-label={`刪除 ${item.name}`}
                        className="flex-none p-1 text-ink-4 transition active:text-danger"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {!mine && viewed.length > 0 && (
          <div className="flex items-center justify-center gap-[6px] pb-[14px] pt-[6px] text-[13px] text-ink-3">
            <Icon name="users" size={16} /> 這是 {partnerName} 的清單，你可以看到進度但不能修改
          </div>
        )}
      </div>

      {/* 右下新增 FAB（僅自己視角） */}
      {mine && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="新增行李項目"
          className="absolute bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-3 active:scale-95"
        >
          <Icon name="plus" size={26} />
        </button>
      )}

      {addOpen && (
        <AddPackSheet
          suggestions={categorySuggestions}
          onAdd={handleAdd}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}
