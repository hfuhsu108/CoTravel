import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// GitHub Pages 子路徑：網址為 https://hfuhsu108.github.io/<repo>/
// 之後若 repo 名不同，改這個常數即可（dev 模式維持 '/'，不影響本機）。
const REPO_BASE = '/CoTravel/'

export default defineConfig(({ command }) => {
  const base = command === 'build' ? REPO_BASE : '/'

  return {
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
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
          icons: [
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
              src: 'pwa-512x512.png',
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
