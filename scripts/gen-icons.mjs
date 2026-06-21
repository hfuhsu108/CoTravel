// 由 public/icon.svg 產生 PWA 安裝所需的 PNG 圖示。
// 用 @resvg/resvg-js（自包含、無外部 DLL 依賴）而非 sharp——sharp 在含中文的專案路徑下
// 會 ERR_DLOPEN_FAILED（相依 libvips DLL 在非 ASCII 路徑解析失敗）。換來源圖後 `npm run gen:icons` 重跑。
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(resolve(root, 'public/icon.svg'))

// [輸出檔名, 邊長]；maskable 與 512 同圖（來源已全 bleed、主元素置中於安全區）
const targets = [
  ['pwa-64x64.png', 64],
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['maskable-icon-512x512.png', 512],
  ['apple-touch-icon-180x180.png', 180],
]

for (const [name, size] of targets) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(resolve(root, 'public', name), png)
  console.log(`✓ public/${name} (${size}×${size})`)
}
