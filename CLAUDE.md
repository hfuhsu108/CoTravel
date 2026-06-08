# CoTravel — Claude Code 專案指示

這是「共編旅遊行程 App」的開發專案。以下規則供 Claude Code 在本專案工作時遵循。
（全域工作習慣見使用者 `~/.claude/CLAUDE.md`；本檔為**專案層**補充。）

## 專案本質

- 兩人自用的旅遊行程共編 **PWA**。專案代號 **CoTravel**，產品名 **同行**。技術棧見 `README.md` 與 `docs/02`。
- 需求全貌見 `docs/01-產品規劃書.md`，**動工前先讀它與 `docs/05-開發路線圖.md`**。
- 資料庫 schema 見 `docs/03-資料模型.md`，**改動資料結構前先讀它，並同步更新該文件**。

## 設計稿是視覺真實來源（重要）

- `design_handoff/` 是 Claude Design 的**高擬真原型**，**非產線碼**——不要照抄它的 HTML class，而是**對照 design tokens 用本專案技術棧重建**，視覺力求 1:1。
- 動 UI 前先讀 `design_handoff/README.md`（逐畫面說明）與 `design_handoff/styles.css`（所有 tokens）；可開 `design_handoff/同行.html` 看實際互動。
- **雙色系**：`--primary`（薰衣草紫＝我）與 `--pink`（夥伴），全 App 用這組色標示「誰的/誰做的」。建議把這兩色做成可換 theme，其餘色用 `color-mix()` 同規則推導。
- 字體：Noto Sans TC（內文）+ Quicksand（數字/Logo）。圖示對應 prototype 的 icon 名單（見其 README）。
- 原型角色固定為「我=宥宥」「夥伴=小柔」，僅供 demo；產品接真實兩人資料。
- 原型的手繪地圖（`StylizedMap`）只代表「要有一張可放 pin/路線/區域圈的地圖」，實作換成 Google Maps。

## 技術棧與慣例

- **前端**：React + Vite + TypeScript；PWA（vite-plugin-pwa）。
- **狀態/資料**：Supabase JS SDK（`@supabase/supabase-js`），即時同步用 Supabase Realtime。
- **地圖**：Google Maps JavaScript API（`@vis.gl/react-google-maps` 或 `@react-google-maps/api`），路線用 Directions Service。
- **樣式**：以 prototype 的設計為準；建議 Tailwind CSS。
- **檔案儲存抽象**：所有檔案存取**必須**透過 `src/lib/storage/` 的抽象介面，**不可**在元件裡直接呼叫 Supabase Storage——這是為了未來無痛換成 Cloudflare R2（見 `docs/02`）。

## 做事規則

1. **語言**：繁體中文回應與註解；程式碼識別字、套件名、CLI 旗標保留原文。註解只寫「為什麼」。
2. **環境**：Windows 11 + PowerShell。`npm install` 若遇 `UnauthorizedAccess` / ExecutionPolicy 錯誤，改用 `cmd /c npm install`，**不要**叫使用者改 ExecutionPolicy。
3. **金鑰安全**：金鑰一律進 `.env`（已被 `.gitignore`，若未初始化 git 則手動小心）。**絕不**把金鑰寫進程式碼或文件。
4. **Supabase 安全**：所有資料表都要有 **Row Level Security（RLS）**，只允許該趟旅程的成員存取。新增表時一併寫 RLS policy。
5. **Git**：預設只改檔不 commit；除非使用者明說「commit / 提交 / push」。
6. **健康檢查**：改 `package.json`、大幅重構、或加新功能後，主動跑 `npm run build` / lint / 啟動 dev server 驗證。dev server 用背景執行避免阻塞。
7. **務實邊界**（已與使用者確認）：
   - kkday / klook / uber / grab **無公開下單 API**，只做 deep link 跳轉，**不要**嘗試串接其訂購流程。
   - 機票/飯店匯入**第一版只做手動快速填入**，不做 PDF/截圖自動解析（排第二階段）。

## 核心領域概念（避免誤解）

- **item**：行程項目，分兩型 — `point`（定點）與 `area`（區域）。
- **area**：地圖上一個圓形範圍，內含多個**不排序**的候選店家（`area_candidates`）。
- **bookmark**：`status = 'bookmark'` 且未指派到某天的 item，地圖上以不同顏色顯示。
- **transport**：兩個相鄰 item 之間的交通，`mode` 為 `walk/transit/drive/custom`。
- **改動通知**：使用者要的是「對方改動時給通知」，**不需要**即時游標／逐字同步。用 Realtime 訂閱 + 寫入 `activity_log` 即可。

## 離線需求（已確認）

- **文件匣的檔案要能離線看**（落地沒網路調機票 QR / 簽證）→ PWA 快取已下載的文件。
- 已排好的行程文字與交通資訊一併快取。
- **地圖、搜尋、即時路線計算需要網路**（使用者接受此取捨）。

## 提交前自檢

- [ ] 新表有 RLS policy？
- [ ] 檔案存取走 `src/lib/storage/` 抽象？
- [ ] 金鑰沒有外洩到程式碼/文件？
- [ ] 改了資料結構有同步更新 `docs/03`？
- [ ] build 通過、dev server 起得來？
