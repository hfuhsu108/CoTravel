import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// 集中管理 PWA 的「更新」與「安裝」狀態，設定頁只消費 usePwa()。
// 更新採 prompt 模式（見 vite.config registerType）：偵測到新版不靜默重載，交使用者按鈕套用。

type CheckResult = 'idle' | 'checking' | 'latest' | 'available' | 'error'

// beforeinstallprompt 尚未進標準 lib.dom，自行宣告最小型別
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaContextValue {
  version: string
  builtAt: string
  needRefresh: boolean
  checkResult: CheckResult
  checkForUpdate: () => Promise<void>
  applyUpdate: () => void
  canInstall: boolean
  installed: boolean
  isIOS: boolean
  promptInstall: () => Promise<void>
}

const PwaContext = createContext<PwaContextValue | null>(null)

// 已安裝（standalone 開啟）：桌面/Android 看 display-mode，iOS Safari 看 navigator.standalone
function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function detectIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function PwaProvider({ children }: { children: ReactNode }) {
  // SW 註冊由 useRegisterSW 完成（dev 模式 devOptions.enabled=false 時為 no-op stub，不會壞）
  const regRef = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      regRef.current = reg
    },
  })

  const [checkResult, setCheckResult] = useState<CheckResult>('idle')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(detectStandalone)
  const isIOS = detectIOS()

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // 攔下瀏覽器預設的安裝橫幅，改由設定頁按鈕觸發
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // 載入時 SW 主動回報有等待中的新版 → 同步為「有新版」（不靠使用者先按檢查）
  useEffect(() => {
    if (needRefresh) setCheckResult('available')
  }, [needRefresh])

  const checkForUpdate = useCallback(async () => {
    const reg = regRef.current
    if (!reg) {
      // 沒有 SW（dev 模式或瀏覽器不支援）→ 視為暫時無法檢查
      setCheckResult('error')
      return
    }
    setCheckResult('checking')
    try {
      await reg.update()
      // update() 後若已有 installing/waiting 代表抓到新版；needRefresh 是非同步到位的後備判斷
      const hasNew = !!reg.installing || !!reg.waiting || needRefresh
      setCheckResult(hasNew ? 'available' : 'latest')
    } catch {
      setCheckResult('error')
    }
  }, [needRefresh])

  const applyUpdate = useCallback(() => {
    // 觸發 skipWaiting 並重新載入到新版本
    void updateServiceWorker(true)
  }, [updateServiceWorker])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const value: PwaContextValue = {
    version: __APP_VERSION__,
    builtAt: __APP_BUILT_AT__,
    needRefresh,
    checkResult,
    checkForUpdate,
    applyUpdate,
    canInstall: !!deferredPrompt && !installed,
    installed,
    isIOS,
    promptInstall,
  }

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext)
  if (!ctx) throw new Error('usePwa 必須在 <PwaProvider> 內使用')
  return ctx
}
