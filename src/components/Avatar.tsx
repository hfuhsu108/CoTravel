// 圓形頭像：有 avatarUrl 顯示圖、否則顯示名字首字。
// partner=true 用夥伴粉色，否則主色——全 App 用這組雙色標示「誰的/誰做的」。
interface AvatarProps {
  name?: string | null
  avatarUrl?: string | null
  partner?: boolean
  size?: number
  ring?: boolean
  online?: boolean
  className?: string
}

function initialOf(name?: string | null): string {
  const trimmed = (name ?? '').trim()
  // 取第一個字（中文姓名常用單字代表；英文取首字母大寫）
  return trimmed ? Array.from(trimmed)[0].toUpperCase() : '?'
}

export default function Avatar({
  name,
  avatarUrl,
  partner = false,
  size = 38,
  ring = false,
  online = false,
  className = '',
}: AvatarProps) {
  return (
    <div
      className={`relative flex flex-none items-center justify-center overflow-visible rounded-full font-round font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.42),
        background: partner ? 'var(--pink)' : 'var(--primary)',
        boxShadow: ring ? '0 0 0 2px var(--surface)' : undefined,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name ?? ''} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initialOf(name)}</span>
      )}
      {online && (
        <span
          className="absolute rounded-full"
          style={{
            right: -1,
            bottom: -1,
            width: '30%',
            height: '30%',
            minWidth: 8,
            minHeight: 8,
            background: 'var(--ok)',
            boxShadow: '0 0 0 2px var(--surface)',
          }}
        />
      )}
    </div>
  )
}

// 兩人頭像重疊對（對應 prototype 的 .av-pair，第二顆往左疊 -9px）
export function AvatarPair({
  a,
  b,
  size = 28,
}: {
  a: { name?: string | null; avatarUrl?: string | null }
  b: { name?: string | null; avatarUrl?: string | null }
  size?: number
}) {
  return (
    <div className="flex">
      <Avatar name={a.name} avatarUrl={a.avatarUrl} size={size} ring />
      <Avatar name={b.name} avatarUrl={b.avatarUrl} partner size={size} ring className="-ml-[9px]" />
    </div>
  )
}
