import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useAuth } from '../../lib/auth'
import { getTripWithMembers } from '../../lib/api'
import {
  addCandidate,
  addItem,
  ensureDays,
  listCandidatesByItems,
  listItems,
  moveItemToDay,
  removeCandidate,
  removeItem,
  reorderItems,
  setCandidateChosen,
  updateItem,
  type ItemPatch,
} from '../../lib/itinerary'
import { errMessage } from '../../lib/errMessage'
import { env } from '../../lib/env'
import { formatRange } from '../../lib/date'
import type { AreaCandidate, Day, Item, TripWithMembers } from '../../lib/types'
import Icon from '../../components/Icon'
import Sheet from '../../components/ui/Sheet'
import TripMap from '../../components/map/TripMap'
import MapTopBar from '../../components/map/MapTopBar'
import DayTabs from '../../components/map/DayTabs'
import DaySidebar from '../../components/map/DaySidebar'
import MarkerPopup from '../../components/map/MarkerPopup'
import DetailSheet from '../../components/map/detail/DetailSheet'
import PlaceSearch, { type PickKind, type PickedPlace } from '../../components/map/PlaceSearch'
import AddAreaSheet from '../../components/map/AddAreaSheet'

function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// 拖拉碰撞：指標所在的放置區優先（精準命中 Day 分頁 / 卡片），否則退回最近中心
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : closestCenter(args)
}

type SearchState = { mode: 'add' | 'candidate'; targetItemId?: string } | null

// 畫面 2 地圖分頁：真實 Google Maps + 按天側欄。階段 2 核心畫面。
export default function MapTab() {
  const { tripId = '' } = useParams()
  const { user } = useAuth()
  const meId = user?.id ?? ''

  const [trip, setTrip] = useState<TripWithMembers | null>(null)
  const [days, setDays] = useState<Day[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [candidates, setCandidates] = useState<AreaCandidate[]>([])
  const [currentDayId, setCurrentDayId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [showRoute, setShowRoute] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 互動狀態
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [popupItemId, setPopupItemId] = useState<string | null>(null)
  const [detailItemId, setDetailItemId] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [search, setSearch] = useState<SearchState>(null)
  const [areaMode, setAreaMode] = useState(false)
  const [pendingAreaCenter, setPendingAreaCenter] = useState<google.maps.LatLngLiteral | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const t = await getTripWithMembers(tripId)
        if (!t) throw new Error('找不到這趟旅程，或你不是成員')
        const d = await ensureDays(t)
        const its = await listItems(tripId)
        const areaIds = its.filter((i) => i.type === 'area').map((i) => i.id)
        const cands = await listCandidatesByItems(areaIds)
        if (!active) return
        setTrip(t)
        setDays(d)
        setItems(its)
        setCandidates(cands)
        const today = todayStr()
        setCurrentDayId(d.find((x) => x.date === today)?.id ?? d[0]?.id ?? null)
      } catch (e) {
        if (active) setError(errMessage(e))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [tripId])

  const candidatesByItem = useMemo(() => {
    const m = new Map<string, AreaCandidate[]>()
    for (const c of candidates) {
      const arr = m.get(c.item_id) ?? []
      arr.push(c)
      m.set(c.item_id, arr)
    }
    return m
  }, [candidates])

  const currentDay = days.find((d) => d.id === currentDayId) ?? null
  const dayItems = useMemo(
    () =>
      items
        .filter((i) => i.status === 'scheduled' && i.day_id === currentDayId)
        .sort((a, b) => a.order_index - b.order_index),
    [items, currentDayId],
  )
  const bookmarks = useMemo(() => items.filter((i) => i.status === 'bookmark'), [items])

  const detailItem = items.find((i) => i.id === detailItemId) ?? null
  const popupItem = items.find((i) => i.id === popupItemId) ?? null

  // 以當天/書籤第一個座標當搜尋偏好（提升在地相關性）
  const mapBias = useMemo<google.maps.LatLngLiteral | undefined>(() => {
    const withCoord = [...dayItems, ...bookmarks].find((i) => i.lat != null && i.lng != null)
    return withCoord ? { lat: withCoord.lat as number, lng: withCoord.lng as number } : undefined
  }, [dayItems, bookmarks])

  function stationLabelFor(item: Item): string | null {
    if (item.status !== 'scheduled' || !item.day_id) return null
    const day = days.find((d) => d.id === item.day_id)
    if (!day) return null
    if (item.type === 'area') return `Day ${day.day_index}・區域`
    const dayPoints = items
      .filter((i) => i.status === 'scheduled' && i.day_id === item.day_id && i.type === 'point')
      .sort((a, b) => a.order_index - b.order_index)
    const idx = dayPoints.findIndex((p) => p.id === item.id)
    return idx >= 0 ? `Day ${day.day_index}・第 ${idx + 1} 站` : `Day ${day.day_index}`
  }

  function selectDay(dayId: string) {
    setCurrentDayId(dayId)
    setSelectedItemId(null)
    setPopupItemId(null)
  }

  // ---- 加入地點 / 候選（PlaceSearch 的 onPick；失敗則 throw 讓搜尋頁內顯示） ----
  async function handlePick(place: PickedPlace, kind: PickKind) {
    if (kind === 'candidate' && search?.targetItemId) {
      const cand = await addCandidate({
        item_id: search.targetItemId,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        google_place_id: place.google_place_id,
      })
      setCandidates((cs) => [...cs, cand])
    } else {
      const newItem = await addItem({
        trip_id: tripId,
        type: 'point',
        status: kind === 'bookmark' ? 'bookmark' : 'scheduled',
        day_id: kind === 'bookmark' ? null : currentDayId,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        google_place_id: place.google_place_id,
        photo_url: place.photo_url,
      })
      setItems((its) => [...its, newItem])
    }
    setSearch(null)
  }

  async function handleUpdateItem(id: string, patch: ItemPatch) {
    try {
      const updated = await updateItem(id, patch)
      setItems((its) => its.map((i) => (i.id === id ? updated : i)))
    } catch (e) {
      setError(errMessage(e))
    }
  }

  async function handleRemoveItem(id: string) {
    try {
      await removeItem(id)
      setItems((its) => its.filter((i) => i.id !== id))
      setCandidates((cs) => cs.filter((c) => c.item_id !== id))
      setDetailItemId(null)
      setPopupItemId(null)
      setSelectedItemId(null)
    } catch (e) {
      setError(errMessage(e))
    }
  }

  async function handleMoveDay(id: string, dayId: string) {
    try {
      const updated = await moveItemToDay(id, dayId)
      setItems((its) => its.map((i) => (i.id === id ? updated : i)))
      setCurrentDayId(dayId)
      setDetailItemId(null)
      setPopupItemId(null)
      setSelectedItemId(null)
    } catch (e) {
      setError(errMessage(e))
    }
  }

  async function handleToggleCandidate(candidate: AreaCandidate) {
    const next = !candidate.chosen
    setCandidates((cs) => cs.map((c) => (c.id === candidate.id ? { ...c, chosen: next } : c)))
    try {
      await setCandidateChosen(candidate.id, next)
    } catch (e) {
      setCandidates((cs) => cs.map((c) => (c.id === candidate.id ? { ...c, chosen: !next } : c)))
      setError(errMessage(e))
    }
  }

  async function handleRemoveCandidate(id: string) {
    const prev = candidates
    setCandidates((cs) => cs.filter((c) => c.id !== id))
    try {
      await removeCandidate(id)
    } catch (e) {
      setCandidates(prev)
      setError(errMessage(e))
    }
  }

  async function handleConfirmArea(data: {
    name: string
    time_slot: string | null
    radius_m: number
  }) {
    if (!pendingAreaCenter) return
    const newItem = await addItem({
      trip_id: tripId,
      type: 'area',
      status: 'scheduled',
      day_id: currentDayId,
      name: data.name,
      lat: pendingAreaCenter.lat,
      lng: pendingAreaCenter.lng,
      radius_m: data.radius_m,
      time_slot: data.time_slot,
    })
    setItems((its) => [...its, newItem])
    setPendingAreaCenter(null)
  }

  function handleMapClick(latLng: google.maps.LatLngLiteral) {
    if (areaMode) {
      setPendingAreaCenter(latLng)
      setAreaMode(false)
    } else {
      setSelectedItemId(null)
      setPopupItemId(null)
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = e
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    if (overId.startsWith('day:')) {
      const dayId = overId.slice(4)
      const item = items.find((i) => i.id === activeId)
      if (item && item.day_id !== dayId) void handleMoveDay(activeId, dayId)
      return
    }

    if (activeId !== overId) {
      const ids = dayItems.map((i) => i.id)
      const oldIndex = ids.indexOf(activeId)
      const newIndex = ids.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0) return
      const newOrder = arrayMove(ids, oldIndex, newIndex)
      // 樂觀更新本地 order_index，再持久化
      setItems((its) =>
        its.map((i) => {
          const pos = newOrder.indexOf(i.id)
          return pos >= 0 ? { ...i, order_index: pos } : i
        }),
      )
      void reorderItems(newOrder).catch((err) => setError(errMessage(err)))
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-ink-3">載入中…</div>
  }
  if (error && !trip) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    )
  }
  if (!env.googleMapsApiKey) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-sm text-danger">
        缺少 Google Maps 金鑰，請在 .env 設定 VITE_GOOGLE_MAPS_API_KEY。
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-map-bg">
      <APIProvider apiKey={env.googleMapsApiKey} language="zh-TW" region="TW">
        <TripMap
          dayItems={dayItems}
          bookmarks={bookmarks}
          selectedItemId={selectedItemId}
          showRoute={showRoute}
          onSelectItem={(it) => {
            setSelectedItemId(it.id)
            setPopupItemId(it.id)
          }}
          onMapClick={handleMapClick}
        />

        {trip && (
          <MapTopBar
            tripName={trip.name}
            dateRange={formatRange(trip.start_date, trip.end_date)}
            members={trip.members}
            meId={meId}
          />
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div
            className="pointer-events-none absolute inset-x-0 z-30 px-3"
            style={{ top: 'calc(env(safe-area-inset-top) + 58px)' }}
          >
            <div className="pointer-events-auto">
              <DayTabs
                days={days}
                currentDayId={currentDayId}
                dragging={activeDragId !== null}
                onSelect={selectDay}
              />
            </div>
          </div>

          {collapsed ? (
            <div className="absolute inset-x-4 bottom-6 z-20 flex gap-[9px]">
              <button
                type="button"
                onClick={() => setSearch({ mode: 'add' })}
                className="flex flex-1 items-center gap-[9px] rounded-lg bg-surface px-[14px] py-[12px] text-left shadow-3"
              >
                <Icon name="search" size={19} className="text-ink-3" />
                <span className="text-[14.5px] font-semibold text-ink-3">搜尋景點…</span>
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="展開行程清單"
                className="flex w-[50px] items-center justify-center rounded-lg bg-surface text-primary-deep shadow-3 active:scale-95"
              >
                <Icon name="list" size={21} />
              </button>
            </div>
          ) : (
            <DaySidebar
              day={currentDay}
              items={dayItems}
              candidatesByItem={candidatesByItem}
              selectedItemId={selectedItemId}
              showRoute={showRoute}
              onToggleRoute={() => setShowRoute((r) => !r)}
              onCollapse={() => setCollapsed(true)}
              onSelectItem={(it) => {
                setSelectedItemId(it.id)
                setDetailItemId(it.id)
                setPopupItemId(null)
              }}
              onToggleCandidate={handleToggleCandidate}
              onAddItem={() => setAddMenuOpen(true)}
            />
          )}
        </DndContext>

        {/* 圈區域模式：頂部提示 */}
        {areaMode && (
          <div
            className="absolute inset-x-4 z-[55] flex items-center gap-2 rounded-2xl bg-[#2b2440] px-4 py-3 text-white shadow-3"
            style={{ top: 'calc(env(safe-area-inset-top) + 120px)' }}
          >
            <Icon name="layers" size={18} />
            <span className="flex-1 text-[13px] font-semibold">點地圖選擇區域中心</span>
            <button type="button" onClick={() => setAreaMode(false)} aria-label="取消">
              <Icon name="x" size={16} />
            </button>
          </div>
        )}

        {/* marker 小卡（圈區域模式時不顯示，避免遮擋） */}
        {popupItem && !areaMode && (
          <MarkerPopup
            item={popupItem}
            days={days}
            onClose={() => {
              setPopupItemId(null)
              setSelectedItemId(null)
            }}
            onOpenDetail={() => {
              setDetailItemId(popupItem.id)
              setPopupItemId(null)
            }}
            onScheduleToDay={(dayId) => handleMoveDay(popupItem.id, dayId)}
          />
        )}

        {/* 詳情頁（畫面 3） */}
        {detailItem && trip && (
          <DetailSheet
            item={detailItem}
            candidates={candidatesByItem.get(detailItem.id) ?? []}
            days={days}
            members={trip.members}
            meId={meId}
            stationLabel={stationLabelFor(detailItem)}
            onClose={() => setDetailItemId(null)}
            onUpdate={(patch) => handleUpdateItem(detailItem.id, patch)}
            onRemove={() => handleRemoveItem(detailItem.id)}
            onMoveDay={(dayId) => handleMoveDay(detailItem.id, dayId)}
            onToggleCandidate={handleToggleCandidate}
            onRemoveCandidate={handleRemoveCandidate}
            onAddCandidate={() => setSearch({ mode: 'candidate', targetItemId: detailItem.id })}
          />
        )}

        {/* 搜尋（加定點/書籤 或 加候選）——置於詳情之後，候選模式時疊在詳情之上 */}
        {search && (
          <PlaceSearch
            title={search.mode === 'candidate' ? '新增候選店家' : '搜尋景點'}
            mode={search.mode}
            bias={mapBias}
            onClose={() => setSearch(null)}
            onPick={handlePick}
          />
        )}

        {/* 圈區域設定 sheet */}
        {pendingAreaCenter && (
          <AddAreaSheet onClose={() => setPendingAreaCenter(null)} onConfirm={handleConfirmArea} />
        )}

        {/* 「＋ 加項目」動作選單 */}
        {addMenuOpen && (
          <Sheet onClose={() => setAddMenuOpen(false)}>
            <div className="px-[22px] pb-[34px] pt-2">
              <h2 className="mb-4 text-xl font-bold">加什麼？</h2>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false)
                    setSearch({ mode: 'add' })
                  }}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-1 active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px] bg-primary-soft text-primary-deep">
                    <Icon name="pin" size={22} />
                  </span>
                  <div>
                    <div className="text-[15px] font-bold">搜尋景點加定點</div>
                    <div className="text-[12.5px] text-ink-3">餐廳、景點、地址都可</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false)
                    setCollapsed(true)
                    setAreaMode(true)
                  }}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-1 active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px] bg-primary-soft text-primary-deep">
                    <Icon name="layers" size={22} />
                  </span>
                  <div>
                    <div className="text-[15px] font-bold">圈一個區域</div>
                    <div className="text-[12.5px] text-ink-3">放多個不排序的候選店家</div>
                  </div>
                </button>
              </div>
            </div>
          </Sheet>
        )}
      </APIProvider>
    </div>
  )
}
