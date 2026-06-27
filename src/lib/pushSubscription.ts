import { supabase } from './supabase'
import { env } from './env'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!env.vapidPublicKey
  )
}

export interface PushEnv {
  supported: boolean
  isIOS: boolean
  isAndroid: boolean
  isStandalone: boolean // 是否從主畫面 PWA 啟動（iOS 推播的硬性前提）
  permission: NotificationPermission | 'unsupported'
}

// 偵測目前裝置/啟動環境，供設定頁決定要顯示開關還是哪種權限引導。
export function getPushEnv(): PushEnv {
  const ua = navigator.userAgent || ''
  // iPadOS 13+ 會偽裝成 Macintosh，靠觸控點數輔助判斷
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  const isAndroid = /android/i.test(ua)
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  const permission: NotificationPermission | 'unsupported' =
    'Notification' in window ? Notification.permission : 'unsupported'
  return { supported: isPushSupported(), isIOS, isAndroid, isStandalone, permission }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return false

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey) as BufferSource,
      })
    }

    const keys = sub.toJSON().keys
    if (!keys?.p256dh || !keys?.auth) return false

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        keys_p256dh: keys.p256dh,
        keys_auth: keys.auth,
      },
      { onConflict: 'user_id,endpoint' },
    )

    if (error) {
      console.warn('[push] 儲存推播訂閱失敗', error)
      return false
    }
    return true
  } catch (e) {
    console.warn('[push] 訂閱推播失敗', e)
    return false
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  } catch (e) {
    console.warn('[push] 取消推播訂閱失敗', e)
  }
}
