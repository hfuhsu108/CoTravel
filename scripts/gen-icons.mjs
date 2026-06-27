// 由 branding/icon.png（優先）或 branding/icon.svg 產生 PWA 安裝所需的 PNG 圖示。
// 用 @resvg/resvg-js（自包含、無外部 DLL 依賴）而非 sharp——sharp 在含中文的專案路徑下
// 會 ERR_DLOPEN_FAILED（相依 libvips DLL 在非 ASCII 路徑解析失敗）。換來源圖後 `npm run gen:icons` 重跑。
import { Resvg } from '@resvg/resvg-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 來源圖：優先 branding/icon.png（高擬真點陣版），無則退回 branding/icon.svg（手繪向量版）。
// PNG 以 data URI 包進一張滿版 SVG，交 resvg 依各目標尺寸重新柵格化縮放——
// 仍走 resvg（自包含、無 DLL 依賴），避開 sharp 在含中文專案路徑下的 ERR_DLOPEN_FAILED。
function loadSource() {
  const pngPath = resolve(root, 'branding/icon.png')
  if (existsSync(pngPath)) {
    const b64 = readFileSync(pngPath).toString('base64')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 2048 2048"><image href="data:image/png;base64,${b64}" width="2048" height="2048"/></svg>`
  }
  return readFileSync(resolve(root, 'branding/icon.svg'))
}

const source = loadSource()

// [輸出檔名, 邊長]；maskable 與 512 同圖（來源已全 bleed、主元素置中於安全區）
const targets = [
  ['pwa-64x64.png', 64],
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['maskable-icon-512x512.png', 512],
  ['apple-touch-icon-180x180.png', 180],
]

for (const [name, size] of targets) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(resolve(root, 'public', name), png)
  console.log(`✓ public/${name} (${size}×${size})`)
}
