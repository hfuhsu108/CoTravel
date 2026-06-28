import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
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
  displayName,
  duplicateItem,
  ensureDays,
  findSamePlace,
  listCandidatesByItems,
  listItems,
  moveItemToDay,
  removeCandidate,
  removeFromBookmarks,
  removeItem,
  reorderItems,
  setCandidateChosen,
  updateItem,
  type ItemPatch,
} from '../../lib/itinerary'
import { listTransports, removeTransport, upsertTransport } from '../../lib/transports'
import { ensureListsExist, listBookmarkLists } from '../../lib/bookmarkLists'
import { logActivity } from '../../lib/activity'
import { tzForCoords } from '../../lib/time'
import { computeDaySchedule } from '../../lib/schedule'
import { computeDayWarnings } from '../../lib/scheduleWarnings'
import { useTripRealtime } from '../../lib/tripRealtime'
import { errMessage } from '../../lib/errMessage'
import { env } from '../../lib/env'
import { formatRange } from '../../lib/date'
import { useIsWide } from '../../lib/useIsWide'
import { useOnline } from '../../lib/useOnline'
import { getSnapshot, saveSnapshot } from '../../lib/offline/itineraryCache'
import type { AreaCandidate, BookmarkList, Day, Item, Transport, TripWithMembers } from '../../lib/types'
import Icon from '../../components/Icon'
import Sheet from '../../components/ui/Sheet'
import TripMap from '../../components/map/TripMap'
import MapTopBar from '../../components/map/MapTopBar'
import DayTabs from '../../components/map/DayTabs'
import DaySidebar from '../../components/map/DaySidebar'
import MarkerPopup from '../../components/map/MarkerPopup'
import BookmarkListSheet from '../../components/map/BookmarkListSheet'
import BookmarkDetailSheet from '../../components/map/BookmarkDetailSheet'
import ListPickerSheet from '../../components/map/ListPickerSheet'
import PoiPopup from '../../components/map/PoiPopup'
import type { PoiDetails } from '../../lib/places'
import DetailSheet from '../../components/map/detail/DetailSheet'
import TransitDetail, { type TransitSavePayload } from '../../components/map/detail/TransitDetail'
import PlaceSearch, { type PickKind, type PickedPlace } from '../../components/map/PlaceSearch'
import AddAreaSheet from '../../components/map/AddAreaSheet'
import NotificationsSheet from '../../components/NotificationsSheet'
import OfflineItinerary from '../../components/map/OfflineItinerary'

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
  const { ticks, unread, markSeen } = useTripRealtime()
  const isWide = useIsWide() // 寬螢幕：地圖左側常駐 + 當日行程右欄（決策 1）
  const online = useOnline() // 階段 7：離線時改顯唯讀快取行程（地圖需網路）

  const [trip, setTrip] = useState<TripWithMembers | null>(null)
  const [days, setDays] = useState<Day[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [candidates, setCandidates] = useState<AreaCandidate[]>([])
  const [transports, setTransports] = useState<Transport[]>([])
  const [listMetas, setListMetas] = useState<BookmarkList[]>([])
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
  // 開啟中的交通編輯（相鄰 from→to 兩項目 id）
  const [transitEdit, setTransitEdit] = useState<{ fromId: string; toId: string } | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  // 功能 4：點 Google POI 浮出的資訊卡（資料來自 Places 即時查詢）
  const [poi, setPoi] = useState<PoiDetails | null>(null)
  // 功能 2：書籤（收藏）列表
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [bookmarkDetailItem, setBookmarkDetailItem] = useState<Item | null>(null)
  // 功能 2：加入書籤前的暫存地點（先選清單再 addItem，像 Google 地圖）
  const [pendingBookmark, setPendingBookmark] = useState<PickedPlace | null>(null)
  // 搜尋偏好範圍：開搜尋時 snapshot 當下地圖邊界，整個搜尋 session 固定（避免輸入到一半範圍跳動）
  const mapBoundsRef = useRef<google.maps.LatLngBoundsLiteral | null>(null)
  const [searchBias, setSearchBias] = useState<google.maps.LatLngLiteral | google.maps.LatLngBoundsLiteral | undefined>(undefined)
  // 當前定位
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; nonce: number } | null>(null)
  const [locating, setLocating] = useState(false)

  // 滑鼠：小位移即拖；觸控：須長按 0.2 秒（期間位移 <8px）才進入拖曳，避免手機輕滑列表誤觸發排序
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

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
        const trs = await listTransports(tripId)
        const lists = await listBookmarkLists(tripId)
        if (!active) return
        setTrip(t)
        setDays(d)
        setItems(its)
        setCandidates(cands)
        setTransports(trs)
        setListMetas(lists)
        const today = todayStr()
        setCurrentDayId(d.find((x) => x.date === today)?.id ?? d[0]?.id ?? null)
      } catch (e) {
        // navigator 判定離線 → 用本機快取進唯讀模式（不顯示錯誤，交給 !online 分支渲染 OfflineItinerary）
        if (!navigator.onLine) {
          try {
            const snap = await getSnapshot(tripId)
            if (active && snap) {
              setTrip(snap.trip)
              setDays(snap.days)
              setItems(snap.items)
              setCandidates(snap.candidates)
              setTransports(snap.transports)
              setListMetas(snap.listMetas)
              setCurrentDayId(
                snap.days.find((x) => x.date === todayStr())?.id ?? snap.days[0]?.id ?? null,
              )
            }
          } catch (cacheErr) {
            console.warn('[map] 讀取離線快取失敗', cacheErr)
          }
        } else if (active) {
          setError(errMessage(e))
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [tripId])

  // 階段 7：連線且資料就緒時，把整包行程寫入離線快取（初載與 realtime 刷新後皆更新）。
  useEffect(() => {
    if (!online || loading || !trip) return
    void saveSnapshot(tripId, {
      trip,
      days,
      items,
      candidates,
      transports,
      listMetas,
      cachedAt: new Date().toISOString(),
    }).catch((e) => console.warn('[map] 寫入離線快取失敗', e))
  }, [online, loading, trip, days, items, candidates, transports, listMetas, tripId])

  // ---- Realtime（階段 6）：tick 變更 → 靜默 refetch（不閃 loading、不重設目前天）----
  // 鏡像 items 給 reloadCandidates 用（避免 callback 依賴 items 造成每次重建）
  const itemsRef = useRef<Item[]>([])
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const reloadItinerary = useCallback(async () => {
    try {
      const its = await listItems(tripId)
      const areaIds = its.filter((i) => i.type === 'area').map((i) => i.id)
      const cands = await listCandidatesByItems(areaIds)
      setItems(its)
      setCandidates(cands)
    } catch (e) {
      console.warn('[map] 行程即時刷新失敗', e)
    }
  }, [tripId])

  const reloadCandidates = useCallback(async () => {
    try {
      const areaIds = itemsRef.current.filter((i) => i.type === 'area').map((i) => i.id)
      setCandidates(await listCandidatesByItems(areaIds))
    } catch (e) {
      console.warn('[map] 候選即時刷新失敗', e)
    }
  }, [])

  const reloadTransports = useCallback(async () => {
    try {
      setTransports(await listTransports(tripId))
    } catch (e) {
      console.warn('[map] 交通即時刷新失敗', e)
    }
  }, [tripId])

  const reloadLists = useCallback(async () => {
    try {
      setListMetas(await listBookmarkLists(tripId))
    } catch (e) {
      console.warn('[map] 清單即時刷新失敗', e)
    }
  }, [tripId])

  // 拖拉中不能 refetch（setItems 會重排 SortableContext、打斷拖拉），先記 pending、放手後補。
  // 300ms debounce：合併一次重排造成的多筆 UPDATE 事件（自己的寫入也會觸發事件，多刷一次無害）。
  type ReloadKind = 'itinerary' | 'candidates' | 'transports'
  const activeDragRef = useRef(false)
  const pendingReloadRef = useRef<Set<ReloadKind>>(new Set())
  const reloadTimerRef = useRef<number | null>(null)

  const flushReloads = useCallback(() => {
    reloadTimerRef.current = null
    if (activeDragRef.current) return
    const kinds = pendingReloadRef.current
    pendingReloadRef.current = new Set()
    // itinerary 的 reload 已含候選，不重複查
    if (kinds.has('itinerary')) void reloadItinerary()
    else if (kinds.has('candidates')) void reloadCandidates()
    if (kinds.has('transports')) void reloadTransports()
  }, [reloadItinerary, reloadCandidates, reloadTransports])

  const queueReload = useCallback(
    (kind: ReloadKind) => {
      pendingReloadRef.current.add(kind)
      if (activeDragRef.current) return
      if (reloadTimerRef.current != null) window.clearTimeout(reloadTimerRef.current)
      reloadTimerRef.current = window.setTimeout(flushReloads, 300)
    },
    [flushReloads],
  )

  // 卸載時清掉未觸發的 debounce timer
  useEffect(
    () => () => {
      if (reloadTimerRef.current != null) window.clearTimeout(reloadTimerRef.current)
    },
    [],
  )

  // 各表 tick：首渲染（含初載）跳過，之後每次變更排入 refetch
  const itemsTick = ticks.items
  const firstItemsTickRef = useRef(true)
  useEffect(() => {
    if (firstItemsTickRef.current) {
      firstItemsTickRef.current = false
      return
    }
    queueReload('itinerary')
  }, [itemsTick, queueReload])

  const candidatesTick = ticks.area_candidates
  const firstCandidatesTickRef = useRef(true)
  useEffect(() => {
    if (firstCandidatesTickRef.current) {
      firstCandidatesTickRef.current = false
      return
    }
    queueReload('candidates')
  }, [candidatesTick, queueReload])

  const transportsTick = ticks.transports
  const firstTransportsTickRef = useRef(true)
  useEffect(() => {
    if (firstTransportsTickRef.current) {
      firstTransportsTickRef.current = false
      return
    }
    queueReload('transports')
  }, [transportsTick, queueReload])

  // 清單 metadata（icon/顏色）他處變更 → 刷新（不走拖拉 debounce，直接重載）
  const listsTick = ticks.bookmark_lists
  const firstListsTickRef = useRef(true)
  useEffect(() => {
    if (firstListsTickRef.current) {
      firstListsTickRef.current = false
      return
    }
    void reloadLists()
  }, [listsTick, reloadLists])

  const candidatesByItem = useMemo(() => {
    const m = new Map<string, AreaCandidate[]>()
    for (const c of candidates) {
      const arr = m.get(c.item_id) ?? []
      arr.push(c)
      m.set(c.item_id, arr)
    }
    return m
  }, [candidates])

  // 交通以相鄰對 (from→to) 查表：重排後不再相鄰者查不到、顯示為「加交通」（不破壞 DB 資料）
  const transportByPair = useMemo(() => {
    const m = new Map<string, Transport>()
    for (const t of transports) m.set(`${t.from_item_id}|${t.to_item_id}`, t)
    return m
  }, [transports])

  const currentDay = days.find((d) => d.id === currentDayId) ?? null
  const dayItems = useMemo(
    () =>
      items
        .filter((i) => i.status === 'scheduled' && i.day_id === currentDayId)
        .sort((a, b) => a.order_index - b.order_index),
    [items, currentDayId],
  )
  // 功能 5：旅程主時區（目的地座標推得；無座標項目的時差退路、詳情頁判斷異區用）
  const tripTz = useMemo(
    () => tzForCoords(trip?.dest_lat ?? null, trip?.dest_lng ?? null),
    [trip?.dest_lat, trip?.dest_lng],
  )
  // 功能 4/8：當天三時間推算（抵達/停留/離開、跨站串接）與時間防呆警告
  const daySchedule = useMemo(
    () => computeDaySchedule(dayItems, transportByPair, currentDay?.date ?? null, tripTz),
    [dayItems, transportByPair, currentDay?.date, tripTz],
  )
  const flightArrivalItemIds = useMemo(
    () => new Set(transports.filter((t) => t.mode === 'flight').map((t) => t.to_item_id)),
    [transports],
  )
  const dayWarnings = useMemo(
    () =>
      computeDayWarnings(
        dayItems,
        transportByPair,
        daySchedule,
        flightArrivalItemIds,
        currentDay?.date ?? null,
        tripTz,
      ),
    [dayItems, transportByPair, daySchedule, flightArrivalItemIds, currentDay?.date, tripTz],
  )
  const dayWarningCount = useMemo(() => {
    let n = 0
    for (const it of dayItems) n += dayWarnings.get(it.id)?.length ?? 0
    return n
  }, [dayItems, dayWarnings])

  // 地圖愛心：純書籤（未排入）；書籤列表：所有已收藏（含排入某天者，故與地圖愛心分開）
  const bookmarks = useMemo(() => items.filter((i) => i.status === 'bookmark'), [items])
  const bookmarkList = useMemo(() => items.filter((i) => i.is_bookmarked), [items])
  // 全趟用過的標籤（書籤列表貼標籤時供快速選用，達成「分類可重用」）
  const knownTags = useMemo(() => {
    const s = new Set<string>()
    for (const i of items) for (const t of i.tags) s.add(t)
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [items])
  // 清單名 → icon/顏色（書籤 marker 用）
  const listMetaByName = useMemo(
    () =>
      new Map<string, { icon: string; color: string }>(
        listMetas.map((l) => [l.name, { icon: l.icon, color: l.color }]),
      ),
    [listMetas],
  )

  // 功能 3：地圖預設視野退路。當天無項目 → 旅程目的地座標；再無 → 整趟所有項目座標。
  const fallbackCenter = useMemo<google.maps.LatLngLiteral | null>(
    () =>
      trip?.dest_lat != null && trip?.dest_lng != null
        ? { lat: trip.dest_lat, lng: trip.dest_lng }
        : null,
    [trip?.dest_lat, trip?.dest_lng],
  )
  const allCoords = useMemo(
    () =>
      items
        .filter((i) => i.lat != null && i.lng != null)
        .map((i) => ({ lat: i.lat as number, lng: i.lng as number })),
    [items],
  )
  const detailItem = items.find((i) => i.id === detailItemId) ?? null
  const popupItem = items.find((i) => i.id === popupItemId) ?? null

  // 交通編輯：兩端項目 + 既有設定（由相鄰對推導）
  const transitFrom = transitEdit ? (items.find((i) => i.id === transitEdit.fromId) ?? null) : null
  const transitTo = transitEdit ? (items.find((i) => i.id === transitEdit.toId) ?? null) : null
  const editingTransport = transitEdit
    ? (transportByPair.get(`${transitEdit.fromId}|${transitEdit.toId}`) ?? null)
    : null

  // 以當天/書籤第一個座標當搜尋偏好（提升在地相關性）
  const mapBias = useMemo<google.maps.LatLngLiteral | undefined>(() => {
    const withCoord = [...dayItems, ...bookmarks].find((i) => i.lat != null && i.lng != null)
    return withCoord ? { lat: withCoord.lat as number, lng: withCoord.lng as number } : undefined
  }, [dayItems, bookmarks])

  function openSearch(state: NonNullable<SearchState>) {
    setSearchBias(mapBoundsRef.current ?? mapBias)
    setSearch(state)
  }

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setError('此裝置不支援定位功能')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, nonce: Date.now() })
        setLocating(false)
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: '定位權限被拒絕，請在瀏覽器設定中允許',
          2: '無法取得位置資訊',
          3: '定位逾時，請重試',
        }
        setError(msgs[err.code] ?? '定位失敗')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

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

  // activity_log 摘要用的「Day N」字樣
  function dayLabelOf(dayId: string | null): string {
    const d = days.find((x) => x.id === dayId)
    return d ? `Day ${d.day_index}` : '行程'
  }

  // ---- 加入地點 / 候選（PlaceSearch 的 onPick；失敗則 throw 讓搜尋頁內顯示） ----
  async function handlePick(place: PickedPlace, kind: PickKind) {
    // 書籤改兩段式：先關搜尋、再跳清單選擇（見 handleConfirmBookmark），不在此直接 addItem
    if (kind === 'bookmark') {
      setPendingBookmark(place)
      setSearch(null)
      return
    }
    if (kind === 'candidate' && search?.targetItemId) {
      const areaName = items.find((i) => i.id === search.targetItemId)?.name ?? '區域'
      const cand = await addCandidate({
        item_id: search.targetItemId,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        google_place_id: place.google_place_id,
      })
      setCandidates((cs) => [...cs, cand])
      logActivity(tripId, meId, 'candidate_add', `在「${areaName}」加了候選「${place.name}」`)
    } else {
      const newItem = await addItem({
        trip_id: tripId,
        type: 'point',
        status: 'scheduled',
        day_id: currentDayId,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        google_place_id: place.google_place_id,
        photo_url: place.photo_url,
      })
      setItems((its) => [...its, newItem])
      logActivity(tripId, meId, 'item_add', `把「${place.name}」加到 ${dayLabelOf(currentDayId)}`)
    }
    setSearch(null)
  }

  // 功能 2：選好清單後才真正建立書籤（tags 即清單；至少一個）。失敗 throw 給 ListPickerSheet 顯示。
  // upsert：本趟若已有同一地點（不論已排入或已是書籤），只標收藏旗標＋併入清單、不新增重複，
  // 否則會產生「同地點兩筆、且新書籤筆 day_id=null 顯示未排入」的錯亂。
  async function handleConfirmBookmark(lists: string[]) {
    if (!pendingBookmark) return
    const place = pendingBookmark
    const existing = findSamePlace(items, place)
    if (existing) {
      const mergedTags = [...new Set([...existing.tags, ...lists])]
      const patch: ItemPatch = { is_bookmarked: true, tags: mergedTags }
      // 既有點原本沒照片、而這次帶了照片 → 順手補上，書籤卡才有縮圖
      if (!existing.photo_url && place.photo_url) patch.photo_url = place.photo_url
      const updated = await updateItem(existing.id, patch)
      setItems((its) => its.map((i) => (i.id === existing.id ? updated : i)))
      const where = updated.day_id ? `（已在 ${dayLabelOf(updated.day_id)}，仍保留行程）` : ''
      logActivity(tripId, meId, 'item_add', `把「${updated.name}」加進書籤${where}`)
    } else {
      const newItem = await addItem({
        trip_id: tripId,
        type: 'point',
        status: 'bookmark',
        day_id: null,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        google_place_id: place.google_place_id,
        photo_url: place.photo_url,
        is_bookmarked: true,
        tags: lists,
      })
      setItems((its) => [...its, newItem])
      logActivity(tripId, meId, 'item_add', `把「${place.name}」加進書籤（${lists.join('、')}）`)
    }
    // 新清單名補建 metadata 列（best-effort：失敗不影響書籤本身）
    try {
      await ensureListsExist(tripId, lists)
    } catch (e) {
      console.warn('[map] 補建清單 metadata 失敗', e)
    }
    setPendingBookmark(null)
  }

  // 功能 4：把 POI 卡片的地點加入行程（當天）或書籤；沿用 addItem。
  // 失敗時 throw 給 PoiPopup 顯示 inline 錯誤（成功才 setPoi(null) 關卡）。
  async function handleAddPoi(kind: 'point' | 'bookmark') {
    if (!poi) return
    // 書籤改兩段式：把 POI 帶進 pendingBookmark、關卡 → 跳清單選擇
    if (kind === 'bookmark') {
      setPendingBookmark({
        name: poi.name,
        lat: poi.lat,
        lng: poi.lng,
        google_place_id: poi.google_place_id,
        photo_url: poi.photo_url,
      })
      setPoi(null)
      return
    }
    const newItem = await addItem({
      trip_id: tripId,
      type: 'point',
      status: 'scheduled',
      day_id: currentDayId,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      google_place_id: poi.google_place_id,
      photo_url: poi.photo_url,
    })
    setItems((its) => [...its, newItem])
    logActivity(tripId, meId, 'item_add', `把「${poi.name}」加到 ${dayLabelOf(currentDayId)}`)
    setPoi(null)
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
      // 名稱要在刪除前抓，否則 state 已濾掉查不到
      const name = items.find((i) => i.id === id)?.name ?? '一個項目'
      await removeItem(id)
      setItems((its) => its.filter((i) => i.id !== id))
      setCandidates((cs) => cs.filter((c) => c.item_id !== id))
      // DB 端 transports FK on delete cascade 會清掉；本地同步移除避免殘留查表
      setTransports((ts) => ts.filter((t) => t.from_item_id !== id && t.to_item_id !== id))
      setDetailItemId(null)
      setPopupItemId(null)
      setSelectedItemId(null)
      logActivity(tripId, meId, 'item_remove', `移除了「${name}」`)
    } catch (e) {
      setError(errMessage(e))
    }
  }

  // 功能 2：從書籤列表移除。已排入某天 → 只清收藏旗標（保留行程）；純書籤 → 整筆刪。
  async function handleRemoveBookmark(item: Item) {
    try {
      const updated = await removeFromBookmarks(item)
      if (updated) {
        setItems((its) => its.map((i) => (i.id === item.id ? updated : i)))
        logActivity(tripId, meId, 'item_remove', `把「${item.name}」移出書籤`)
      } else {
        setItems((its) => its.filter((i) => i.id !== item.id))
        setCandidates((cs) => cs.filter((c) => c.item_id !== item.id))
        setTransports((ts) => ts.filter((t) => t.from_item_id !== item.id && t.to_item_id !== item.id))
        logActivity(tripId, meId, 'item_remove', `移除了書籤「${item.name}」`)
      }
    } catch (e) {
      setError(errMessage(e))
    }
  }

  // 功能 3：複製景點（插在原項目之後）。其後項目 order_index 在 DB 已順移，故整批重抓。
  async function handleDuplicate(item: Item) {
    try {
      await duplicateItem(item)
      setItems(await listItems(tripId))
      setDetailItemId(null)
      logActivity(tripId, meId, 'item_add', `複製了「${displayName(item)}」`)
    } catch (e) {
      setError(errMessage(e))
    }
  }

  async function handleMoveDay(id: string, dayId: string) {
    try {
      const name = items.find((i) => i.id === id)?.name ?? '一個項目'
      const updated = await moveItemToDay(id, dayId)
      setItems((its) => its.map((i) => (i.id === id ? updated : i)))
      setCurrentDayId(dayId)
      setDetailItemId(null)
      setPopupItemId(null)
      setSelectedItemId(null)
      logActivity(tripId, meId, 'item_move', `把「${name}」移到 ${dayLabelOf(dayId)}`)
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

  // 交通：以相鄰對 upsert（一段一列），回寫本地 state（依 id 取代/新增）。
  // 失敗時 throw 給 TransitDetail 顯示 inline 錯誤（不在此吞掉）。
  async function handleSaveTransport(fromId: string, toId: string, payload: TransitSavePayload) {
    const saved = await upsertTransport({
      trip_id: tripId,
      from_item_id: fromId,
      to_item_id: toId,
      ...payload,
    })
    setTransports((ts) => [...ts.filter((t) => t.id !== saved.id), saved])
    const fromName = items.find((i) => i.id === fromId)?.name ?? '起點'
    const toName = items.find((i) => i.id === toId)?.name ?? '終點'
    logActivity(tripId, meId, 'transport_set', `設定了「${fromName} → ${toName}」的交通`)
  }

  async function handleRemoveTransport(id: string) {
    try {
      // from/to 名稱要在刪除前反查
      const tr = transports.find((t) => t.id === id)
      const fromName = tr ? items.find((i) => i.id === tr.from_item_id)?.name : null
      const toName = tr ? items.find((i) => i.id === tr.to_item_id)?.name : null
      await removeTransport(id)
      setTransports((ts) => ts.filter((t) => t.id !== id))
      setTransitEdit(null)
      logActivity(
        tripId,
        meId,
        'transport_remove',
        fromName && toName ? `移除了「${fromName} → ${toName}」的交通` : '移除了一段交通',
      )
    } catch (e) {
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
    logActivity(tripId, meId, 'item_add', `把區域「${data.name}」加到 ${dayLabelOf(currentDayId)}`)
  }

  function handleMapClick(latLng: google.maps.LatLngLiteral) {
    if (areaMode) {
      setPendingAreaCenter(latLng)
      setAreaMode(false)
    } else {
      setSelectedItemId(null)
      setPopupItemId(null)
      setPoi(null)
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id))
    activeDragRef.current = true
  }

  // 拖拉結束/取消：解除 refetch 封鎖，把拖拉期間累積的 pending 補上
  function endDragGuard() {
    activeDragRef.current = false
    if (pendingReloadRef.current.size > 0) {
      if (reloadTimerRef.current != null) window.clearTimeout(reloadTimerRef.current)
      reloadTimerRef.current = window.setTimeout(flushReloads, 300)
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveDragId(null)
    endDragGuard()
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
  // 離線：地圖/搜尋/即時路線需網路，改顯唯讀快取行程（無快取時元件自顯「先連線一次」提示）
  if (!online) {
    return (
      <OfflineItinerary
        trip={trip}
        days={days}
        items={items}
        candidates={candidates}
        transports={transports}
      />
    )
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
    <div className="absolute inset-0 flex bg-map-bg">
      <APIProvider apiKey={env.googleMapsApiKey} language="zh-TW" region="TW">
        {/* DnD 同時包住 DayTabs（放置目標）與 DaySidebar（拖拉來源），故置於雙欄之上 */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveDragId(null)
            endDragGuard()
          }}
        >
          {/* 左：地圖區（窄=全幅；寬=flex-1）。浮層都放這層、相對地圖區定位，
              寬螢幕時自動只佔左半、不會被右側行程欄蓋到。 */}
          <div className="relative min-w-0 flex-1">
            <TripMap
              dayItems={dayItems}
              bookmarks={bookmarks}
              listMetaByName={listMetaByName}
              transportByPair={transportByPair}
              selectedItemId={selectedItemId}
              showRoute={showRoute}
              areaMode={areaMode}
              fallbackCenter={fallbackCenter}
              allCoords={allCoords}
              onSelectItem={(it) => {
                setSelectedItemId(it.id)
                setPopupItemId(it.id)
                setPoi(null)
              }}
              onMapClick={handleMapClick}
              onPoiSelected={(p) => {
                setPoi(p)
                setPopupItemId(null)
                setSelectedItemId(null)
              }}
              onPoiError={(m) => setError(m)}
              onBoundsChanged={(b) => { mapBoundsRef.current = b }}
              myLocation={myLocation}
            />

            {trip && (
              <MapTopBar
                tripName={trip.name}
                dateRange={formatRange(trip.start_date, trip.end_date)}
                members={trip.members}
                meId={meId}
                unread={unread}
                onBell={() => {
                  markSeen()
                  setNotifOpen(true)
                }}
              />
            )}

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

            {/* 定位按鈕 */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              aria-label="定位目前位置"
              className="absolute right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-3 active:scale-95 disabled:opacity-60"
              style={{ top: 'calc(env(safe-area-inset-top) + 100px)' }}
            >
              {locating ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Icon name="nav" size={20} className={myLocation ? 'text-primary' : 'text-ink-2'} />
              )}
            </button>

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

            {/* POI 資訊卡（點 Google 地標；圈區域模式時不顯示） */}
            {poi && !areaMode && (
              <PoiPopup
                poi={poi}
                dayLabel={dayLabelOf(currentDayId)}
                onClose={() => setPoi(null)}
                onAdd={handleAddPoi}
              />
            )}
          </div>

          {/* 右：當日行程面板。窄螢幕＝可收合的底部抽屜；寬螢幕＝右側固定欄、恆顯示 */}
          {!isWide && collapsed ? (
            <div className="absolute inset-x-4 bottom-6 z-20 flex gap-[9px]">
              <button
                type="button"
                onClick={() => openSearch({ mode: 'add' })}
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
              wide={isWide}
              day={currentDay}
              items={dayItems}
              candidatesByItem={candidatesByItem}
              transportByPair={transportByPair}
              selectedItemId={selectedItemId}
              showRoute={showRoute}
              onToggleRoute={() => setShowRoute((r) => !r)}
              onCollapse={() => setCollapsed(true)}
              onSelectItem={(it) => {
                setSelectedItemId(it.id)
                setDetailItemId(it.id)
                setPopupItemId(null)
              }}
              onSelectTransport={(from, to) => {
                setTransitEdit({ fromId: from.id, toId: to.id })
                setPopupItemId(null)
                setSelectedItemId(null)
              }}
              onToggleCandidate={handleToggleCandidate}
              onAddItem={() => setAddMenuOpen(true)}
              onOpenBookmarks={() => setBookmarkOpen(true)}
              bookmarkCount={bookmarkList.length}
              schedule={daySchedule}
              warningsByItem={dayWarnings}
              warningCount={dayWarningCount}
            />
          )}
        </DndContext>

        {/* 詳情頁（畫面 3） */}
        {detailItem && trip && (
          <DetailSheet
            item={detailItem}
            candidates={candidatesByItem.get(detailItem.id) ?? []}
            days={days}
            members={trip.members}
            meId={meId}
            stationLabel={stationLabelFor(detailItem)}
            tripTz={tripTz}
            effTime={daySchedule.get(detailItem.id) ?? null}
            warnings={dayWarnings.get(detailItem.id) ?? []}
            onClose={() => setDetailItemId(null)}
            onUpdate={(patch) => handleUpdateItem(detailItem.id, patch)}
            onRemove={() => handleRemoveItem(detailItem.id)}
            onDuplicate={() => handleDuplicate(detailItem)}
            onMoveDay={(dayId) => handleMoveDay(detailItem.id, dayId)}
            onToggleCandidate={handleToggleCandidate}
            onRemoveCandidate={handleRemoveCandidate}
            onAddCandidate={() => openSearch({ mode: 'candidate', targetItemId: detailItem.id })}
          />
        )}

        {/* 交通詳情（畫面 3 TransitDetail）：相鄰 from→to 兩項目間的交通 */}
        {transitEdit && transitFrom && transitTo && (
          <TransitDetail
            fromItem={transitFrom}
            toItem={transitTo}
            transport={editingTransport}
            meId={meId}
            onClose={() => setTransitEdit(null)}
            onSave={(payload) => handleSaveTransport(transitEdit.fromId, transitEdit.toId, payload)}
            onRemove={() =>
              editingTransport ? handleRemoveTransport(editingTransport.id) : Promise.resolve()
            }
          />
        )}

        {/* 搜尋（加定點/書籤 或 加候選）——置於詳情之後，候選模式時疊在詳情之上 */}
        {search && (
          <PlaceSearch
            title={search.mode === 'candidate' ? '新增候選店家' : '搜尋景點'}
            mode={search.mode}
            bias={searchBias}
            onClose={() => setSearch(null)}
            onPick={handlePick}
          />
        )}

        {/* 圈區域設定 sheet */}
        {pendingAreaCenter && (
          <AddAreaSheet onClose={() => setPendingAreaCenter(null)} onConfirm={handleConfirmArea} />
        )}

        {/* 鈴鐺：最近改動清單 */}
        {notifOpen && trip && (
          <NotificationsSheet
            tripId={tripId}
            members={trip.members}
            meId={meId}
            onClose={() => setNotifOpen(false)}
          />
        )}

        {/* 書籤（收藏）列表 */}
        {bookmarkOpen && (
          <BookmarkListSheet
            bookmarks={bookmarkList}
            days={days}
            knownTags={knownTags}
            onClose={() => setBookmarkOpen(false)}
            onAddBookmark={() => {
              setBookmarkOpen(false)
              openSearch({ mode: 'add' })
            }}
            onOpenDetail={(item) => setBookmarkDetailItem(item)}
            onScheduleToDay={(item, dayId) => handleMoveDay(item.id, dayId)}
            onRemove={handleRemoveBookmark}
            onUpdateTags={(item, tags) => handleUpdateItem(item.id, { tags })}
          />
        )}

        {/* 書籤詳情（全頁浮層）：點書籤列表裡的景點名開啟 */}
        {bookmarkDetailItem && trip && (
          <BookmarkDetailSheet
            item={bookmarkDetailItem}
            days={days}
            members={trip.members}
            meId={meId}
            onClose={() => setBookmarkDetailItem(null)}
            onUpdate={async (patch) => {
              await handleUpdateItem(bookmarkDetailItem.id, patch)
              setBookmarkDetailItem((prev) =>
                prev ? { ...prev, ...patch } as Item : null,
              )
            }}
            onScheduleToDay={(dayId) => handleMoveDay(bookmarkDetailItem.id, dayId)}
            onRemove={async () => {
              await handleRemoveBookmark(bookmarkDetailItem)
              setBookmarkDetailItem(null)
            }}
          />
        )}

        {/* 加入書籤前的清單選擇（像 Google 地圖「儲存到清單」） */}
        {pendingBookmark && (
          <ListPickerSheet
            placeName={pendingBookmark.name}
            knownLists={knownTags}
            onClose={() => setPendingBookmark(null)}
            onConfirm={handleConfirmBookmark}
          />
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
                    openSearch({ mode: 'add' })
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
