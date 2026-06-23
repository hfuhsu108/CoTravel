import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// GitHub Pages 子路徑：網址為 https://hfuhsu108.github.io/<repo>/
// 之後若 repo 名不同，改這個常數即可（dev 模式維持 '/'，不影響本機）。
const REPO_BASE = '/CoTravel/'

// 語意版本取自 package.json，作為設定頁顯示的主版本號（發布時手動 bump）
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string
}

// 版本識別：語意版本（package.json）為主，附建置 SHA（CI 用 GITHUB_SHA，本機用 git short SHA），
// 供設定頁顯示「目前版本」，讓使用者部署後能在手機上比對是否已更新到位。
function resolveAppVersion(): string {
  const sha = process.env.GITHUB_SHA
    ? process.env.GITHUB_SHA.slice(0, 7)
    : (() => {
        try {
          return execSync('git rev-parse --short HEAD').toString().trim()
        } catch {
          return ''
        }
      })()
  return sha ? `v${pkg.version} (${sha})` : `v${pkg.version}`
}

export default defineConfig(({ command }) => {
  const base = command === 'build' ? REPO_BASE : '/'

  return {
    base,
    // 編譯期注入版本資訊（dev 與 build 皆生效），由設定頁顯示
    define: {
      __APP_VERSION__: JSON.stringify(resolveAppVersion()),
      __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      VitePWA({
        // prompt：偵測到新版時不靜默重載，由設定頁「檢查更新」讓使用者手動套用
        registerType: 'prompt',
        // scope / start_url 對齊 base，避免 GitHub Pages 子路徑下 SW 失效
        scope: base,
        includeAssets: ['favicon.svg'],
        manifest: {
          name: '同行 · CoTravel',
          short_name: '同行',
          description: '兩人共編的旅遊行程 PWA',
          theme_color: '#7a6cf0',
          background_color: '#fbfafd',
          display: 'standalone',
          scope: base,
          start_url: base,
          // icons 由 scripts/gen-icons.mjs 從 public/icon.svg 產生（換圖重跑 npm run gen:icons）
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              // 獨立的 maskable 圖（Android 自適應圖示用），修正先前誤指非 maskable 512 的問題
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // 預快取 app shell，離線仍可開啟 App。
          // 文件離線改走應用層 IndexedDB（src/lib/offline/docCache.ts），由使用者每份手動下載，
          // 不依賴 workbox runtimeCaching。行程文字離線快取留後續階段。
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  }
})
