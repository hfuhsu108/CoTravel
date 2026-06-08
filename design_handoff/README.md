# Handoff：同行 · 旅遊共編 App

> 給拿到這份資料的工程師（Claude Code）：這是一份**設計交付文件**。以下所有檔案都是用 HTML / React + Babel 做出來的**高擬真原型（design reference）**，用來呈現「最終長相與互動行為」，**不是要直接搬進產線的程式碼**。請以你的目標環境（React Native / Flutter / SwiftUI / 任何既有 codebase）的慣例、元件庫與設計系統，**把這些畫面重新實作出來**；若專案還沒有環境，請替它挑選最合適的框架再實作。

---

## Overview（這是什麼）

**同行** 是一款專為「兩個人」設計的旅遊共編 App（情侶 / 伴侶 / 旅伴）。核心概念：兩人配對後，一起在**地圖上**排行程、共享**文件匣**（機票、訂房、證件），並各自管理**行李清單**且能看到對方進度。

整個原型以一支 iPhone（393 × 852，directional 直式）呈現，桌面寬版時左側有一塊「展示控制列」可快速跳轉畫面 / 切換狀態——那塊**只是 demo 工具，不屬於產品本身**，實作時請忽略。

兩位角色固定為：
- **我（ME）**：暱稱「宥宥」，頭像字「宥」，主色 = `--primary`（薰衣草紫）。
- **夥伴（PARTNER）**：暱稱「小柔」，頭像字「柔」，夥伴色 = `--pink`（粉）。
- App 全程用「主色 vs 夥伴色」這組雙色來區分「誰做的 / 誰的東西」。

---

## About the Design Files

| 檔案 | 內容 |
|---|---|
| `同行.html` | 進入點。載入 React 18 + Babel standalone，掛載所有 `.jsx`，並含手機縮放 script 與桌面展示控制列樣式。 |
| `styles.css` | **全部 design tokens 與共用 class**（顏色、陰影、圓角、字體、按鈕、卡片、sheet、chip、checkbox…）。這份是還原視覺最重要的檔案。 |
| `data.jsx` | 所有 mock 資料 + `Ico` 圖示元件 + `ICONS` SVG path 庫。 |
| `Map.jsx` | `StylizedMap` 手繪風格地圖（純 SVG，非真實地圖）。 |
| `screens-auth-list.jsx` | 畫面 0 登入/配對、畫面 1 旅程列表、建立旅程 sheet、個人檔案 sheet。 |
| `screens-main.jsx` | 畫面 2 主畫面（地圖 + 當日行程側欄）、畫面 3 項目詳情（景點 / 區域 / 交通）。 |
| `screens-docs-packing.jsx` | 畫面 4 文件匣、畫面 5 行李清單，及上傳 / 新增 sheet。 |
| `tweaks-panel.jsx` | 原型用的主題色調整面板，**產品不需要**，可忽略。 |

> 開原型：直接用瀏覽器開 `同行.html` 即可（需連網載入 Google Fonts + unpkg 的 React/Babel）。

---

## Fidelity：高擬真（Hi-Fi）

這是**像素級高擬真**原型：顏色、字體、間距、圓角、陰影、互動轉場都已定稿。請**盡量 1:1 還原**視覺，並用目標 codebase 既有的元件與模式去實作（不要照抄 HTML class，而是對照 design tokens 重建）。

---

## 字體 Typography

兩套字體（皆來自 Google Fonts）：

- **`--ff`（內文）**：`"Noto Sans TC", "PingFang TC", -apple-system, sans-serif`，weights 400 / 500 / 700 / 900。用於所有中文內文、按鈕、標題。
- **`--ff-round`（圓體 / 數字）**：`"Quicksand", "Noto Sans TC", sans-serif`，weights 500 / 600 / 700。用於：狀態列時間、Logo 字、數字（`.num` class，含 `font-feature-settings:"tnum"`）、eyebrow 小標、地圖 pin 編號。

常用字級（px）：頁面大標 h1 22、登入主標 31、詳情頁標題 25、卡片標題 15.5–18、內文 14–16、chip 11–13、eyebrow 12（`letter-spacing:.14em`、大寫、`--ink-3`）。

---

## Design Tokens（全部數值見 `styles.css` 的 `:root`）

### 顏色 — 雙色驅動
整個 App 的色彩由兩個變數推導：
```
--primary : #7a6cf0   /* 我 / 主色，薰衣草紫 */
--pink    : #f08fb0   /* 夥伴 / 粉 */
```
其餘色彩用 `color-mix()` 從這兩個衍生（深淺、soft 底色、分隔線、背景）：
- `--primary-deep` = primary 80% + 深紫 → 深色文字 / 按下態
- `--primary-soft` = primary 15% + 白 → 淺底 chip / nav 選中底
- `--primary-softer` = primary 7% + 白
- `--pink-deep` / `--pink-soft` 同理
- `--bg` = primary 6% + 近白 `#fbfafd`（畫面底色）
- `--surface` `#ffffff`、`--surface-2` = primary 4% + 白
- `--line` / `--line-strong` = primary 9% / 16% 混淡灰（分隔線、邊框）

文字階層：`--ink #231d33` / `--ink-2 #5b5470` / `--ink-3 #938cab` / `--ink-4 #bdb7cf`

語意色：`--ok #3bb98f`（+ `--ok-soft #e3f6ee`）、`--warn #f0a04b`（+ `--warn-soft #fdf0e0`、評分星星也用 warn）、`--danger #e8607a`（刪除 / 登出 / 未讀紅點）。

地圖色：`--map-bg #eef2ee`、`--map-water #bfe0e8`、`--map-park #cfe7c6`、`--map-road #ffffff`、`--map-road-minor #f3f1ea`、`--map-block #e7e3da`。

> **主題可換**：原型內建 6 組配色（薰衣草 / 海洋藍 / 森林綠 / 暖橘 / 桃紫 / 石墨青），每組 = [主色, 夥伴色]。實作時建議把 primary/pink 做成可設定的 theme，其餘色用同樣的混色規則推導即可。

### 圓角
`--r-sm 10px` · `--r-md 16px` · `--r-lg 22px` · `--r-xl 28px`。手機外框 54、phone-screen 內圓角 42、sheet 頂部 28、底部側欄 26。

### 陰影
- `--sh-1`：極淡，列表卡片預設
- `--sh-2`：卡片標準
- `--sh-3`：彈出卡片 / sheet / 浮層
- `--sh-pop`：手機外殼
- 主色按鈕另有 `0 6px 16px rgba(122,108,240,.35)`；FAB `0 10px 26px rgba(122,108,240,.45)`。

### 間距
無固定 scale，但慣例：畫面左右 padding 16，appbar `62px 20px 14px`（上方留狀態列），卡片內距 10–14，row gap 11–13，sheet 內距 22。

---

## 共用元件 / class（`styles.css`）

- **`.phone` / `.phone-screen`**：393×852 手機殼 + 內螢幕。`.notch` 瀏海、`.statusbar` 狀態列（9:41 + 訊號/wifi/電池 SVG，預設深字，`.on-dark` 變白）。
- **`.btn`** 系列：`.btn-primary`（主色實心）、`.btn-ghost`（白底描邊）、`.btn-soft`（淺主色底）、`.btn-block`（滿寬）、`.btn-pill`、`.btn-sm`。按下 `scale(.97)`。
- **`.av`** 頭像：圓形、字體用圓體；`.av.b` = 夥伴粉色；`.av-ring` 白外圈；`.av-online` 右下綠點；`.av-pair` 兩頭像重疊 -9px。
- **`.chip`**：圓角標籤，變體 `.gray` / `.ok` / `.warn` / `.pink` / `.chip-live`（直播紅）。
- **`.card`**：白底 + `--r-lg` + `--sh-2`。
- **`.icon-btn`**：40×40 圓角方按鈕；`.bare` 去邊框背景。
- **`.botnav`**：底部三分頁（地圖 / 文件 / 行李），選中項圖示底加 `--primary-soft`、字變 `--primary-deep`。
- **`.fab`**：右下 60×60 圓角主色浮動鈕。
- **`.scrim` + `.sheet`**：半透明遮罩 + 由下滑入的底部 sheet（`slideup` 動畫，`.grip` 把手）。
- **`.slidein`**：由右滑入的全頁（詳情頁用，`slideleft` 動畫）。
- **`.ph`**：**圖片佔位**——135° 斜紋底 + 中央 monospace 標籤（如「大阪 城市照」）。變體 `.warm`（粉斜紋）、`.cool`（藍綠斜紋）。**所有照片在原型裡都是佔位，實作時換成真實圖片元件。**
- **`.seg`**：分段控制（交通方式、行李對象切換）。
- **`.bar > i`**：進度條。
- **`.ck`**：勾選框，`.on` 主色填滿、`.ck.b.on` 夥伴粉。
- **`.field`**：表單欄位（label + input/select，focus 變主色邊框白底）。
- **`.banner`**：頂部深色 toast（夥伴改動通知，`dropin` 動畫）。
- 動畫：`.fadeup`（淡入上移）、`fade` / `slideup` / `slideleft` / `dropin`，緩動多用 `cubic-bezier(.2,.8,.2,1)`。

### 圖示
全部為 inline SVG（`24×24`、`stroke=currentColor`、`strokeWidth≈1.9`、圓角端點），透過 `<Ico name="..." size fill/>` 使用。可用名稱見 `data.jsx` 的 `ICONS`：`map, doc, bag, bell, back, plus, gear, chevR, chevD, star, clock, pin, walk, train, car, search, list, layers, nav, link, upload, cloud, cloudoff, check, x, plane, bed, id, ticket, heart, bookmark, edit, trash, move, google, sparkle, users, camera, mail`。實作時對應到你 codebase 的 icon set 即可。

---

## Screens / Views（畫面逐一說明）

導航結構（`App.jsx` 的 `route` 狀態）：`login → list → trip`；在 `trip` 內用底部 nav 切 `tab`：`map / docs / packing`。詳情與表單以 overlay（`detail` / `sheet`）疊加。

### 0 · 登入 / 配對 `LoginScreen`（`screens-auth-list.jsx`）
- **目的**：登入或首次建立兩人配對。
- **版面**：垂直置中。漸層背景（頂部主色光暈 → 白 → 底部粉）。`Logo`（76px 圓角方塊，內 pin 圖示，右下掛一顆粉色 heart 小圓 = 兩人意象）→ 標題「同行」31px → 副標兩行。
- **元件**：
  - 「使用 Google 登入」（ghost 按鈕，含 Google 彩色圖示）、「使用 Email 登入」（深色 `--ink` 底白字）。
  - 「第一次使用」分隔線下兩顆 soft 方塊鈕：**建立配對** / **用邀請碼加入**（縱向 icon+字）。
  - **建立配對**態：顯示 6 格邀請碼「L O V E 2 6」（淺主色格、圓體大字）+「分享邀請碼並開始」。
  - **加入**態：一個大寫置中、字距 .3em 的邀請碼輸入框 +「加入伴侶」。
  - 底部服務條款小字。
- **互動**：任一登入動作都 `onLogin()` → 進列表。

### 1 · 旅程列表 `TripListScreen`（`screens-auth-list.jsx`）
- **目的**：總覽所有旅程，依狀態分組。
- **版面**：`appbar`（Logo 32 + 「同行」標題 / 右側我的頭像，點頭像開個人檔案）+ 可捲動內容 + 右下 FAB（新增旅程）。
- **分組**（`GroupHeader`：圖示 + 標題 + 數量 chip）：
  - **進行中**（`ongoing`）：大卡（138 高），主色外框 + 較強陰影，badge 為紅色 `chip-live`「進行中・Day 2」。
  - **即將出發**（`upcoming`）：標準卡（104 高），白底 badge 顯示「還有 N 天」。
  - **過往旅程**（`past`）：可收合，卡片 `opacity:.82`，badge「已結束」。
- **卡片 `TripCard`**：封面用 `.ph`（warm/cool 斜紋）或 `MiniMapBg`（SVG 迷你地圖），底部漸層上壓白字標題 + 日期 + 右下兩人頭像對；左上 monospace 封面標籤。點卡片 → 開該旅程主畫面。
- **空狀態**（demo 控制列可切）：置中插圖佔位 +「還沒有任何旅程」+「建立第一趟旅程」。
- 資料見 `data.jsx` 的 `TRIPS`（5 筆：大阪進行中、京都/沖繩即將、東京/台南過往）。

### 2 · 主畫面：地圖 + 當日行程 `MainScreen`（`screens-main.jsx`）— **核心畫面**
- **目的**：在地圖上看當天行程，並編排地點 / 區域 / 交通。
- **版面（由下往上疊）**：
  1. **全螢幕地圖** `StylizedMap`（`Map.jsx`）：手繪風 SVG，含水域、公園、路網、城市街廓；標記分三種——**編號地點 pin**（主色水滴，選中變深、放大）、**區域圈**（虛線圓 + 名稱膠囊，代表「下午在某商圈，內有候選店家」）、**收藏書籤**（heart 形，`want`=空心粉框 / `planned`=粉實心）；`showRoute` 時用主色虛線把地點依序連起來。markers 座標見 `MARKERS`、路線見 `ROUTE`（%）。
  2. **頂部浮層**：返回鈕、置中旅程名+日期、右側兩人頭像對 + 鈴鐺（紅點未讀）。
  3. **Day 分頁**：橫向捲動，Day 1–5，每顆顯示「Day N / 日期」，選中主色實心（資料 `DAYS`）。
  4. **改動通知 banner**：深色 toast「小柔 把『梅田藍天大廈』加到 Day 2」，可點關。
  5. **當日行程側欄**：從底部升起、佔下方約 ⅔，圓角頂 + 把手；標題「7/13 日・Day 2」+ 路線開關鈕 + 收合鈕；可捲動列出行程項目；底部「＋ 加項目」虛線鈕。
     - **可收合**：收合後地圖全顯，底部出現一顆膠囊「Day 2 行程（N 個地點）」可再展開，並露出搜尋列 + 清單切換鈕。
- **行程項目卡**（依 `DAY2` 資料，type 分三種）：
  - **`PlaceCard` 地點**：左側 58×58 縮圖 + 左上編號圓徽，標題、時間 chip、星等；若 `doc:true` 顯示連結圖示。點選 → 開詳情。
  - **`TransitRow` 交通**：縮排、左側虛線連接，交通工具圖示（walk/train/car）+ 路線名 + 時間，點 → 交通詳情。
  - **`AreaCard` 區域**：虛線圓圖示，標題 + 時段 chip +「N 個候選」，可就地展開列出候選店家（勾選＝今天去這間）。
- **選中連動**：點側欄項目或地圖標記，兩邊互相 highlight（`selName`）；點地圖標記另彈出 `popup` 小卡（縮圖 + 名稱 +「加入某天 / 看文件」）。

### 3 · 項目詳情 `DetailSheet`（`screens-main.jsx`）
由右滑入的全頁，頂部 hero 圖（佔位）+ 返回 + 右上「誰加的」頭像。依類型分三種內文：
- **景點 `PlaceDetail`**：標題 + 星等 + 「Day 2・第 N 站」chip；資訊列（地址 / 營業 / 造訪時間，時間可「編輯」）；備註卡；動作：連結文件 / 導航（主），移到其他天（soft）/ 移除（粉底紅字）。
- **區域 `AreaDetail`**：圈選範圍縮圖（虛線圓）+ 候選店家清單（可勾選，勾＝今天去）+「新增候選店家」。
- **交通 `TransitDetail`**：起→迄標題；分段控制（步行 / 大眾運輸 / 開車 / 自定義）；路線縮圖 `MiniRouteMap`（SVG）；非自定義顯示「分鐘 / 公里 / 車資」三大數字，自定義則顯示表單（交通方式 select、時間、費用、備註、連結車票）；底部「開啟路線導航」。

### 4 · 文件匣 `DocsScreen`（`screens-docs-packing.jsx`）
- **目的**：集中放旅程相關文件，支援離線。
- **版面**：appbar「文件匣」+ 右上**線上/離線切換鈕**（cloud / cloudoff，離線時變橘色 warn）。下方四個分類分頁（機票 / 住宿 / 文件 / 其他，各帶數量），可捲動文件列表，右下 FAB（上傳）。
- **`DocRow`**：左側檔案類型圖示方塊（主色 soft 底）、檔名、類型小字、底部 chip 列（誰上傳的頭像 + 離線可用/未快取 + 連結到哪個行程項目）、右側 chevron。
- **離線模式**：頂部黃色提示 chip；已快取文件正常顯示，未快取文件灰階 + 半透明（`disabled`）。
- **空狀態**：佔位插圖 +「這個分類還沒有文件」+「上傳文件」。
- **上傳 sheet `UploadSheet`**：拖曳區佔位 + 選分類 chip + 連結行程 select + 「下載供離線使用」勾選 + 「上傳」。
- 資料見 `DOCS`（flight/hotel/papers/other）與 `DOC_TABS`。

### 5 · 行李清單 `PackingScreen`（`screens-docs-packing.jsx`）
- **目的**：兩人各自打包，互看進度。
- **版面**：appbar「行李清單」+ 兩人頭像對。分段控制切換「我的行李 / 小柔的行李」。下方進度卡（頭像 + 進度條 + 「d/t 已打包」，我的用主色漸層、夥伴用粉漸層）。再下方依分類（證件 / 電子產品 / 盥洗 / 衣物）列出可勾項目。
- **權限規則**：**自己的清單可勾選**（打勾＝刪除線 + 變灰）；**夥伴的清單唯讀**（顯示「唯讀」chip、勾選框用粉色、底部提示「不能修改」、無 FAB）。
- **新增 sheet `AddPackSheet`**：品名 input + 分類 select + 「加入清單」。
- 資料見 `PACK_ME` / `PACK_PA`、進度由 `packStat()` 計算。

---

## Interactions & Behavior

- **路由**：`route`（login/list/trip）+ trip 內 `tab`（map/docs/packing）。詳情 `detail`、各 sheet `sheet`（newTrip/profile/upload/addPack）為 overlay。
- **轉場**：sheet 由下 `slideup`、詳情頁由右 `slideleft`、banner `dropin`、列表項 `fadeup`，皆 `cubic-bezier(.2,.8,.2,1)`、約 .28–.35s。按鈕按下 `scale(.97)`。
- **地圖 ↔ 行程連動**：選地圖標記 highlight 對應卡片並彈 popup；側欄可收合露出全地圖。
- **離線模式**：切換後文件列表過濾 / 灰階未快取項。
- **行李互動**：自己的可 toggle（state 真的會變），夥伴的唯讀。
- **配對概念**：登入流程帶「建立配對 / 邀請碼加入」；全 App 用主色 / 夥伴色標示歸屬。
- 手機縮放：`同行.html` 內的 `fitPhone()` 依視窗高/寬縮放手機殼（純展示，產品實作不需要）。

## State Management（需要的狀態）

來自 `App.jsx`：`route`、`tab`、`trip`（目前旅程）、`sheet`、`detail`、`emptyList`（demo）、`collapsed`（側欄收合）、`showRoute`（地圖路線）、`offline`（離線）。畫面內另有：Day 選擇 `dayIdx`、選中項 `selName`、地圖 popup、banner/鈴鐺開關、區域候選勾選、行李清單 `data{me,pa}`、文件分頁 `tab` 等。實際產品請接後端：旅程 / 行程項目 / 文件 / 行李 / 配對關係，並加上**即時同步**（兩人共編，原型用 banner 模擬對方改動）。

## Assets

原型**沒有任何真實圖片**——所有照片、地圖、插圖都是 `.ph` 斜紋佔位或手繪 SVG（`StylizedMap` / `MiniMapBg` / `MiniRouteMap`）。實作時：
- 真實地圖請接地圖 SDK（Google Maps / Mapbox / Apple Maps），原型的手繪地圖只代表「要有一張可放 pin/路線/區域圈的地圖」。
- 景點 / 封面照片接你的圖片來源。
- 圖示對應到 codebase 既有 icon set（清單見上方）。
- 字體 Noto Sans TC + Quicksand 來自 Google Fonts。

## Files（對照用）

實作每個畫面時，請對照本資料夾內對應的 `.jsx` 與 `styles.css`。`同行.html` 是把它們組起來的進入點，可直接在瀏覽器開啟參考實際長相與互動。
