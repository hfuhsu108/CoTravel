import { useEffect, useState } from 'react'

// 寬螢幕偵測（RWD）：預設斷點 lg=1024px。給需要「依寬窄切行為」的地方用
// （純樣式差異優先用 Tailwind 的 lg: 變體；這個 hook 是給需要 JS 分支的邏輯，
// 例如寬螢幕時行程面板恆顯示、不渲染收合那條）。
export function useIsWide(query = '(min-width: 1024px)'): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setIsWide(mql.matches)
    setIsWide(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return isWide
}
