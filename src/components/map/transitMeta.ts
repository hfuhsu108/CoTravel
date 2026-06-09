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
      return 'walk' // 無單車圖示，暫用步行；本階段 UI 未提供 bike
    case 'custom':
      return 'nav'
  }
}

// 交通列顯示標籤：自定義優先用使用者填的 custom_label，否則用模式中文
export function transportLabel(t: Transport): string {
  if (t.mode === 'custom') return t.custom_label?.trim() || '自定義交通'
  return modeWord(t.mode)
}
