import type { IconName } from '../Icon'
import type { DocumentCategory } from '../../lib/types'

// 四分類的顯示文字與圖示（圖示取自既有 Icon 庫）
interface DocTab {
  k: DocumentCategory
  label: string
  ico: IconName
}

export const DOC_TABS: DocTab[] = [
  { k: 'flight', label: '機票', ico: 'plane' },
  { k: 'lodging', label: '住宿', ico: 'bed' },
  { k: 'document', label: '文件', ico: 'id' },
  { k: 'other', label: '其他', ico: 'doc' },
]

export function categoryLabel(c: DocumentCategory): string {
  return DOC_TABS.find((t) => t.k === c)?.label ?? '其他'
}

export function categoryIcon(c: DocumentCategory): IconName {
  return DOC_TABS.find((t) => t.k === c)?.ico ?? 'doc'
}
