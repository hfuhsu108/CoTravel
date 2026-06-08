# CoTravel（產品名「同行」）— 共編旅遊行程 App

> 專案代號 **CoTravel**（資料夾名）；產品對外名稱為 **同行**（見 prototype）。文件內兩者通用。

兩人一起、即時共編的旅遊行程 PWA。特別解決現有旅遊 App「都以『點』為單位、無法表達『在一個區域裡鬆散逛』、也看不到點與點之間怎麼移動」的痛點。

## 設計稿（視覺真實來源）

`design_handoff/` 是 Claude Design 匯出的**高擬真原型**（HTML + React/Babel，非產線碼）。實作時以它為視覺 1:1 依據：
- 直接用瀏覽器開 `design_handoff/同行.html` 看實際長相與互動。
- 設計 tokens、共用 class、配色（雙色系：主色薰衣草紫 / 夥伴粉）全在 `design_handoff/styles.css`。
- 各畫面對應 jsx 與逐畫面說明見 `design_handoff/README.md`。

## 這是什麼

- **平台**：PWA 網頁（手機 + 電腦皆可，免上架）
- **使用範圍**：兩人自用（情侶共編），但架構保留多趟旅行的長期使用
- **核心差異化**：
  1. **定點 + 區域**兩種行程單位（區域 = 一塊範圍，內含不排序的候選店家）
  2. **點與點之間的交通**（Google 路線規劃匯入 or 自定義交通）
  3. **書籤直接標在地圖上**、用顏色區分「想去 / 已排入」

## 技術棧

| 層 | 選用 |
|---|---|
| 前端 | PWA（建議 React + Vite，詳見 `docs/02`） |
| 地圖 | Google Maps Platform（地圖 + 地點搜尋 + Directions 路線） |
| 後端 / 資料庫 / 認證 / 即時同步 | Supabase（免費方案起步） |
| 檔案儲存 | Supabase Storage（1GB，**儲存層做成可抽換**，未來可換 Cloudflare R2 10GB） |
| 託管 | **GitHub Pages**（純靜態，免費；網址 `https://hfuhsu108.github.io/<repo>/`） |

## 文件導覽

- [`docs/01-產品規劃書.md`](docs/01-產品規劃書.md) — 完整需求與功能定義
- [`docs/02-技術架構與費用.md`](docs/02-技術架構與費用.md) — 架構、服務、費用、關鍵決策
- [`docs/03-資料模型.md`](docs/03-資料模型.md) — 資料庫 schema 設計（含 SQL）
- [`docs/04-畫面規格.md`](docs/04-畫面規格.md) — 6 個畫面的元素與狀態
- [`docs/05-開發路線圖.md`](docs/05-開發路線圖.md) — 分階段任務清單
- [`docs/06-環境設定指南.md`](docs/06-環境設定指南.md) — Supabase / Google Maps 金鑰、`.env` 設定

## 目前進度

- [x] 需求釐清完成
- [x] Claude Design prototype 完成（`design_handoff/`，6 畫面高擬真）
- [ ] 環境設定（Supabase 專案、Google Maps 金鑰）
- [ ] 前端骨架 + 路由
- [ ] 核心功能逐項實作（見 `docs/05`）

## 快速開始

詳見 [`docs/06-環境設定指南.md`](docs/06-環境設定指南.md)。簡述：

```bash
# 安裝依賴（Windows PowerShell 若遇 ExecutionPolicy 問題，改用 cmd /c npm install）
npm install

# 設定環境變數（複製 .env.example → .env 並填入金鑰）

# 啟動開發伺服器
npm run dev
```
