import type { PushEnv } from '../lib/pushSubscription'
import Icon from './Icon'
import Sheet from './ui/Sheet'

export type GuideReason = 'ios-install' | 'blocked' | 'unsupported'

interface PushGuideSheetProps {
  reason: GuideReason
  env: PushEnv
  onClose: () => void
}

interface Guide {
  title: string
  intro: string
  steps: string[]
  note?: string
}

// 依「為何無法直接開啟」與平台，組出對應的手動引導步驟。
function buildGuide(reason: GuideReason, env: PushEnv): Guide {
  if (reason === 'ios-install') {
    return {
      title: '在 iPhone 啟用推播通知',
      intro: 'iOS 需先把「同行」加入主畫面、並從主畫面圖示開啟，才能收到推播。',
      steps: [
        '用 Safari 開啟同行（iOS 上其他瀏覽器不支援推播）',
        '點畫面底部的「分享」鈕（方框加向上箭頭）',
        '下滑選「加入主畫面」→「新增」',
        '回主畫面，點「同行」圖示開啟',
        '回到此設定頁，打開推播通知開關',
      ],
      note: '需 iOS 16.4 以上版本。',
    }
  }

  if (reason === 'blocked') {
    if (env.isIOS) {
      return {
        title: '開啟 iPhone 的通知權限',
        intro: '通知權限先前被拒，需到系統設定手動開啟。',
        steps: [
          '開啟「設定」App',
          '下滑找到並點「同行」',
          '點「通知」',
          '開啟「允許通知」',
          '回到同行重新打開開關',
        ],
      }
    }
    return {
      title: '開啟 Android 的通知權限',
      intro: '通知權限先前被拒，需手動開啟。',
      steps: [
        '長按主畫面「同行」圖示 → 點「應用程式資訊」(ⓘ)',
        '點「通知」→ 開啟通知',
        '回到同行重新打開開關',
      ],
      note: '若關螢幕或鎖屏時收不到：應用程式資訊 →「電池」→ 改為「不受限制」（建議「同行」與「Chrome」都設）。',
    }
  }

  // unsupported
  if (env.isIOS) {
    return {
      title: '此 iPhone 暫不支援推播',
      intro: '你的 iOS 版本可能低於 16.4，或未從主畫面圖示開啟。',
      steps: ['到「設定 → 一般 → 軟體更新」更新到 iOS 16.4 以上', '用 Safari「分享 → 加入主畫面」後，從主畫面開啟同行'],
    }
  }
  return {
    title: '此裝置暫不支援推播',
    intro: '目前的瀏覽器不支援 Web Push。',
    steps: [
      '手機請用 Chrome 開啟，並把同行加入主畫面',
      '桌面請用 Chrome 或 Edge',
      'iPhone 需 iOS 16.4 以上並從主畫面開啟',
    ],
  }
}

export default function PushGuideSheet({ reason, env, onClose }: PushGuideSheetProps) {
  const guide = buildGuide(reason, env)

  return (
    <Sheet onClose={onClose}>
      <div className="px-[22px] pb-[30px] pt-2">
        <h3 className="text-[18px] font-bold text-ink">{guide.title}</h3>
        <p className="mt-2 text-[13.5px] leading-[1.6] text-ink-2">{guide.intro}</p>

        <ol className="mt-4 flex flex-col gap-3">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="num flex h-[24px] w-[24px] flex-none items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-deep">
                {i + 1}
              </span>
              <span className="pt-[2px] text-[14px] leading-[1.55] text-ink">{s}</span>
            </li>
          ))}
        </ol>

        {guide.note && (
          <p className="mt-4 flex items-start gap-[6px] rounded-lg bg-warn-soft/50 px-3 py-[10px] text-[12.5px] leading-[1.55] text-[#b9762a]">
            <Icon name="info" size={14} className="mt-[1px] flex-none" />
            {guide.note}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 flex w-full items-center justify-center rounded-md bg-primary py-[13px] text-[15px] font-bold text-white active:scale-[0.98]"
        >
          知道了
        </button>
      </div>
    </Sheet>
  )
}
