import { useEffect, useState } from 'react'

// 連線狀態：以 navigator.onLine 為準，並訂閱 online/offline 事件即時更新。
// 文件匣用它在真正離線時自動切到離線模式（未快取文件灰階、不可開）。
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}
