import type { IconName } from '../Icon'
import type { Transport, TransportMode } from '../../lib/types'

// 交通模式的中文與圖示（交通列 / 交通詳情共用，對照設計稿 modeWord / ModeIco）。
export function modeWord(mode: TransportMode): string {
  switch (mode) {
    case 'walk':
      return '步行'
    case 'transit':
      return '大眾運輸'
    case 'drive':
      return '開車'
    case 'bike':
      return '騎車'
    case 'custom':
      return '自定義'
    case 'flight':
      return '航班'
  }
}

// 各交通方式的路線顏色（地圖逐段上色用，功能：依移動方式視覺化）。未設定交通的段落由呼叫端用灰。
export function modeRouteColor(mode: TransportMode): string {
  switch (mode) {
    case 'walk':
      return '#6dbf8b' // 薄荷綠
    case 'transit':
      return '#e0895e' // 柿橘
    case 'drive':
      return '#c4915e' // 沙棕
    case 'flight':
      return '#5b7db8' // 灰藍
    case 'bike':
      return '#6fb8c9' // 水色
    case 'custom':
      return '#938cab' // 灰
  }
}

export function modeIcon(mode: TransportMode): IconName {
  switch (mode) {
    case 'walk':
      return 'walk'
    case 'transit':
      return 'train'
    case 'drive':
      return 'car'
    case 'bike':
      return 'bicycle'
    case 'custom':
      return 'nav'
    case 'flight':
      return 'plane'
  }
}

// 交通列顯示標籤：航班用編號、自定義用 custom_label、大眾運輸有步驟時顯示路線（公車號），否則模式中文
export function transportLabel(t: Transport): string {
  if (t.mode === 'flight') return t.flight_no?.trim() || '航班'
  if (t.mode === 'custom') return t.custom_label?.trim() || '自定義交通'
  if (t.mode === 'transit' && t.steps) {
    const lines = t.steps
      .filter((s) => s.mode === 'transit')
      .map((s) => `${s.vehicle ?? ''}${s.line ?? ''}`.trim() || '搭乘')
    if (lines.length > 0) return lines.join('→')
  }
  return modeWord(t.mode)
}
