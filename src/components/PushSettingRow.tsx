import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  getPushEnv,
  subscribeToPush,
  unsubscribeFromPush,
  type PushEnv,
} from '../lib/pushSubscription'
import Icon from './Icon'
import Switch from './ui/Switch'
import PushGuideSheet, { type GuideReason } from './PushGuideSheet'

// on＝已授權且訂閱；off＝支援但未開；blocked＝權限被拒；
// ios-install＝iOS 但未從主畫面啟動；unsupported＝瀏覽器/版本不支援。
type PushState = 'unknown' | 'on' | 'off' | 'blocked' | 'ios-install' | 'unsupported'

function computeState(): PushState {
  const { supported, isIOS, isStandalone, permission } = getPushEnv()
  if (supported) {
    if (permission === 'granted') return 'on'
    if (permission === 'denied') return 'blocked'
    return 'off'
  }
  if (isIOS && !isStandalone) return 'ios-install'
  return 'unsupported'
}

const SUBTITLE: Record<PushState, string> = {
  unknown: '檢查中…',
  on: '已開啟，提醒到期時會推播通知',
  off: '開啟後可在 App 關閉時收到提醒',
  blocked: '通知已被封鎖，點此看如何開啟',
  'ios-install': '需先加入主畫面，點此看教學',
  unsupported: '此裝置／瀏覽器不支援，點此了解',
}

export default function PushSettingRow({ last }: { last?: boolean }) {
  const { user } = useAuth()
  const [env] = useState<PushEnv>(getPushEnv) // 平台等不變資訊，初始化一次
  const [state, setState] = useState<PushState>('unknown')
  const [busy, setBusy] = useState(false)
  const [guide, setGuide] = useState<GuideReason | null>(null)

  useEffect(() => {
    setState(computeState())
  }, [])

  // off↔on 用開關切換；blocked/ios-install/unsupported 點整列開引導
  const isToggle = state === 'on' || state === 'off'

  async function handleToggle() {
    if (busy || !user) return
    setBusy(true)
    try {
      if (state === 'on') {
        await unsubscribeFromPush(user.id)
        setState('off')
      } else {
        const ok = await subscribeToPush(user.id)
        const next = ok ? 'on' : computeState() // 失敗多半因權限被拒 → 重算可能變 blocked
        setState(next)
        if (!ok && next === 'blocked') setGuide('blocked')
      }
    } finally {
      setBusy(false)
    }
  }

  function openGuide() {
    if (state === 'blocked' || state === 'ios-install' || state === 'unsupported') setGuide(state)
  }

  const rowCls = `flex w-full items-center gap-3 px-[14px] py-[15px] text-left ${
    last ? '' : 'border-b border-line'
  }`
  const body = (
    <>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary-soft text-primary-deep">
        <Icon name="bell" size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-bold ${state === 'on' ? 'text-primary-deep' : ''}`}>
          推播通知
        </span>
        <span className="block text-[12.5px] text-ink-3">{busy ? '設定中…' : SUBTITLE[state]}</span>
      </span>
    </>
  )

  return (
    <>
      {isToggle ? (
        <div className={rowCls}>
          {body}
          <Switch
            checked={state === 'on'}
            disabled={busy}
            onChange={handleToggle}
            ariaLabel="推播通知開關"
          />
        </div>
      ) : (
        <button type="button" onClick={openGuide} className={`${rowCls} active:bg-surface-2`}>
          {body}
          <Icon name="chevR" size={18} className="flex-none text-ink-4" />
        </button>
      )}

      {guide && <PushGuideSheet reason={guide} env={env} onClose={() => setGuide(null)} />}
    </>
  )
}
