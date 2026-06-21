import type { Transport } from '../../lib/types'
import { formatDurationZh, spanMinutes, tzOffsetLabel, tzOffsetDiffLabel } from '../../lib/time'
import Icon from '../Icon'

// 'YYYY-MM-DDTHH:MM[:SS]' → 'M/D HH:MM'
function fmtLocal(s: string | null): string {
  if (!s) return '—'
  const date = s.slice(0, 10).split('-')
  const time = s.slice(11, 16)
  if (date.length < 3) return time || '—'
  return `${Number(date[1])}/${Number(date[2])} ${time}`
}

// 航班時刻（唯讀）：起訖機場 + 當地起飛/抵達時間與時區、飛行時數、兩地時差。
// 由文件→機票的 FlightCard 與行程交通詳情（TransitDetail 航班段）共用，避免兩處各維護一份呈現。
export default function FlightSchedule({
  transport: t,
  fromName,
  toName,
}: {
  transport: Transport
  fromName: string
  toName: string
}) {
  const durationMin =
    t.duration_min ??
    (t.depart_local && t.depart_tz && t.arrive_local && t.arrive_tz
      ? spanMinutes(t.depart_local, t.depart_tz, t.arrive_local, t.arrive_tz)
      : null)
  const diff =
    t.depart_tz && t.arrive_tz
      ? tzOffsetDiffLabel(t.depart_tz, t.arrive_tz, t.depart_local ?? undefined)
      : null

  return (
    <div>
      {/* 起訖：機場名 + 當地時間 + 時區 */}
      <div className="flex items-stretch gap-2">
        <FlightEnd
          airport={fromName}
          terminal={t.depart_terminal}
          local={fmtLocal(t.depart_local)}
          tz={t.depart_tz}
          align="left"
        />
        <div className="flex flex-col items-center justify-center px-1">
          <Icon name="plane" size={18} className="text-primary" />
          {durationMin != null && (
            <span className="num mt-1 whitespace-nowrap text-[11px] font-bold text-ink-3">
              {formatDurationZh(durationMin)}
            </span>
          )}
        </div>
        <FlightEnd
          airport={toName}
          terminal={t.arrive_terminal}
          local={fmtLocal(t.arrive_local)}
          tz={t.arrive_tz}
          align="right"
        />
      </div>

      {diff && (
        <div className="mt-2 text-center text-[12px] font-semibold text-ink-3">
          兩地時差 <span className="num">{diff}</span>
        </div>
      )}
    </div>
  )
}

function FlightEnd({
  airport,
  terminal,
  local,
  tz,
  align,
}: {
  airport: string
  terminal: string | null
  local: string
  tz: string | null
  align: 'left' | 'right'
}) {
  return (
    <div className={`min-w-0 flex-1 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div className="truncate text-[14px] font-extrabold leading-tight">{airport}</div>
      {terminal && <div className="truncate text-[11.5px] font-semibold text-ink-3">{terminal}</div>}
      <div className="num mt-[3px] text-[15px] font-bold text-primary-deep">{local}</div>
      {tz && <div className="num text-[11px] font-semibold text-ink-3">{tzOffsetLabel(tz, undefined)}</div>}
    </div>
  )
}
