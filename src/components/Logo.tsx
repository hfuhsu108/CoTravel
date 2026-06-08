import Icon from './Icon'

// 品牌標記：薰衣草紫漸層圓角方塊內含 pin，右下掛一顆粉色 heart 小圓＝兩人意象。
// 尺寸為動態，故用 inline style 換算（對應 design_handoff 的 Logo）。
export default function Logo({ size = 58 }: { size?: number }) {
  return (
    <div
      className="relative flex flex-none items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'linear-gradient(150deg, var(--primary), color-mix(in srgb, var(--primary) 55%, #fff))',
        boxShadow: '0 10px 24px rgba(122, 108, 240, 0.4)',
      }}
    >
      <span className="flex text-white">
        <Icon name="pin" size={size * 0.5} fill />
      </span>
      <span
        className="absolute flex items-center justify-center text-white"
        style={{
          right: -4,
          bottom: -4,
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: '50%',
          background: 'var(--pink)',
          border: '3px solid var(--bg)',
        }}
      >
        <Icon name="heart" size={size * 0.2} fill />
      </span>
    </div>
  )
}
