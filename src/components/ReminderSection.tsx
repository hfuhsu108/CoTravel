import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Reminder, ReminderTargetType, ReminderTemplate } from '../lib/types'
import {
  listRemindersByTarget,
  createReminder,
  deleteReminder,
  templateInfo,
  REMINDER_TEMPLATES,
  OFFSET_OPTIONS,
  type CreateReminderInput,
} from '../lib/reminders'
import { logActivity } from '../lib/activity'
import { errMessage } from '../lib/errMessage'
import { toInstantUTC } from '../lib/time'
import { useTripRealtime } from '../lib/tripRealtime'
import { DateTime } from 'luxon'
import Icon from './Icon'
import Sheet from './ui/Sheet'
import Time24Field from './ui/Time24Field'
import { Eyebrow } from './map/detail/parts'

interface ReminderSectionProps {
  targetType: ReminderTargetType
  targetId: string
  targetName: string
  /** 事件的基準時間（ISO local，如 '2026-07-15T12:00'） */
  baseTime: string | null
  /** 事件的 IANA 時區 */
  baseTz: string | null
  /** 事件的日期（'YYYY-MM-DD'，用於組合 scheduled_time） */
  baseDate?: string | null
  /** 當前使用者 ID */
  meId: string
}

function offsetLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} 分鐘前`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m === 0 ? `${h} 小時前` : `${h} 小時 ${m} 分前`
  }
  const d = Math.floor(minutes / 1440)
  const rem = minutes % 1440
  if (rem === 0) return `${d} 天前`
  const h = Math.floor(rem / 60)
  return `${d} 天 ${h} 小時前`
}

function formatFireAt(isoUtc: string, tz: string | null): string {
  const zone = tz || 'local'
  const dt = DateTime.fromISO(isoUtc, { zone: 'utc' }).setZone(zone)
  if (!dt.isValid) return isoUtc
  return dt.toFormat('M/d HH:mm')
}

export default function ReminderSection({
  targetType,
  targetId,
  targetName,
  baseTime,
  baseTz,
  baseDate,
  meId,
}: ReminderSectionProps) {
  const { tripId = '' } = useParams()
  const { ticks } = useTripRealtime()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setReminders(await listRemindersByTarget(targetType, targetId))
    } catch (e) {
      console.warn('[ReminderSection] 載入提醒失敗', e)
    }
  }, [targetType, targetId])

  useEffect(() => {
    void refresh()
  }, [refresh, ticks.reminders])

  async function handleDelete(r: Reminder) {
    setBusy(true)
    try {
      await deleteReminder(r.id)
      logActivity(tripId, meId, 'reminder_remove', `移除了「${r.target_name}」的${templateInfo(r.template).label}`)
      void refresh()
    } catch (e) {
      console.warn('[ReminderSection] 刪除提醒失敗', e)
    } finally {
      setBusy(false)
    }
  }

  const pending = reminders.filter((r) => !r.fired)
  const fired = reminders.filter((r) => r.fired)

  // 是否有可設定提醒的基準時間
  const hasBase = !!baseTime && !!baseTz

  return (
    <div className="my-4">
      <Eyebrow>提醒</Eyebrow>

      {pending.length === 0 && fired.length === 0 && (
        <p className="mt-2 text-[13px] text-ink-3">
          {hasBase ? '尚未設定提醒' : '設定造訪時間後才能新增提醒'}
        </p>
      )}

      {pending.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {pending.map((r) => {
            const info = templateInfo(r.template)
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg bg-warn-soft/50 px-3 py-[10px]"
              >
                <Icon name={info.icon} size={16} className="flex-none text-[#b9762a]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">
                    {info.label}
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {formatFireAt(r.fire_at, baseTz)}
                    {r.offset_minutes > 0 ? `（${offsetLabel(r.offset_minutes)}）` : ''}
                  </p>
                  {r.message && (
                    <p className="mt-[2px] truncate text-[12px] text-ink-3">{r.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete(r)}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-ink-3 active:scale-90"
                  aria-label="刪除提醒"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {fired.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {fired.map((r) => {
            const info = templateInfo(r.template)
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg px-3 py-[8px] opacity-50"
              >
                <Icon name={info.icon} size={14} className="flex-none text-ink-3" />
                <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink-3 line-through">
                  {info.label} · {formatFireAt(r.fire_at, baseTz)}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete(r)}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-ink-3 active:scale-90"
                  aria-label="刪除已觸發提醒"
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {hasBase && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setSheetOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary-soft py-[11px] text-[14px] font-bold text-primary-deep active:scale-[0.98] disabled:opacity-60"
        >
          <Icon name="bell" size={15} /> 新增提醒
        </button>
      )}

      {sheetOpen && baseTime && baseTz && (
        <AddReminderSheet
          tripId={tripId}
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          baseTime={baseTime}
          baseTz={baseTz}
          baseDate={baseDate ?? null}
          meId={meId}
          onClose={() => setSheetOpen(false)}
          onCreated={() => {
            setSheetOpen(false)
            void refresh()
          }}
        />
      )}
    </div>
  )
}

// ---- 新增提醒 Sheet ----

interface AddReminderSheetProps {
  tripId: string
  targetType: ReminderTargetType
  targetId: string
  targetName: string
  baseTime: string
  baseTz: string
  baseDate: string | null
  meId: string
  onClose: () => void
  onCreated: () => void
}

function AddReminderSheet({
  tripId,
  targetType,
  targetId,
  targetName,
  baseTime,
  baseTz,
  baseDate,
  meId,
  onClose,
  onCreated,
}: AddReminderSheetProps) {
  // 組合完整的事件時間 ISO：如果 baseTime 只有 HH:MM，需加上日期
  const fullBaseISO =
    baseTime.includes('T') || baseTime.includes('-')
      ? baseTime
      : baseDate
        ? `${baseDate}T${baseTime}`
        : baseTime
  const baseDt = DateTime.fromISO(fullBaseISO)

  const [template, setTemplate] = useState<ReminderTemplate>('custom')
  // 'offset'＝相對事件時間提前；'absolute'＝直接指定日期時刻（不依事件時間推算）
  const [mode, setMode] = useState<'offset' | 'absolute'>('offset')
  const [offsetMin, setOffsetMin] = useState(60)
  const [customOffset, setCustomOffset] = useState(false) // 是否用自訂提前量（而非固定選項）
  const [customNum, setCustomNum] = useState('')
  const [customUnit, setCustomUnit] = useState<'min' | 'hour' | 'day'>('hour')
  // 指定絕對時刻：預設帶入事件當下的日期時間，使用者再調整
  const [absDate, setAbsDate] = useState(baseDt.isValid ? baseDt.toFormat('yyyy-LL-dd') : '')
  const [absTime, setAbsTime] = useState(baseDt.isValid ? baseDt.toFormat('HH:mm') : '')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // 選模板時自動切回「提前」模式並套用該模板預設偏移
  function handleTemplateChange(t: ReminderTemplate) {
    setTemplate(t)
    setMode('offset')
    setCustomOffset(false)
    setOffsetMin(templateInfo(t).defaultOffset)
  }

  // 自訂提前量換算成分鐘
  const unitFactor = customUnit === 'day' ? 1440 : customUnit === 'hour' ? 60 : 1
  const customMinutes = customOffset
    ? Math.max(0, Math.round((Number(customNum) || 0) * unitFactor))
    : 0
  const effectiveOffset = customOffset ? customMinutes : offsetMin

  const fireAtUTC = toInstantUTC(fullBaseISO, baseTz)

  // 依模式算出最終觸發 UTC：提前→事件時間減偏移；絕對→直接把選的本地時刻轉 UTC
  const fireAtAdjusted =
    mode === 'absolute'
      ? absDate && absTime
        ? toInstantUTC(`${absDate}T${absTime}`, baseTz)
        : null
      : fireAtUTC
        ? DateTime.fromISO(fireAtUTC, { zone: 'utc' }).minus({ minutes: effectiveOffset }).toISO()
        : null

  const fireDisplay = fireAtAdjusted
    ? DateTime.fromISO(fireAtAdjusted, { zone: 'utc' }).setZone(baseTz).toFormat('M/d HH:mm')
    : null

  // 提前模式選了自訂卻沒填有效數字 → 不可儲存
  const offsetInvalid = mode === 'offset' && customOffset && customMinutes <= 0
  // 觸發時刻已過去 → 擋下：後端 cron 只查 fire_at<=now，過期提醒會被立即誤發
  const firePast =
    fireAtAdjusted != null && DateTime.fromISO(fireAtAdjusted, { zone: 'utc' }) <= DateTime.utc()

  async function handleSave() {
    if (!fireAtAdjusted || offsetInvalid || firePast) return
    setSaving(true)
    setSaveError(null)
    try {
      const input: CreateReminderInput = {
        trip_id: tripId,
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        template,
        message: message.trim() || null,
        fire_at: fireAtAdjusted,
        // 絕對時刻不依偏移推算，offset 存 0（顯示時不標「提前」）
        offset_minutes: mode === 'absolute' ? 0 : effectiveOffset,
        created_by: meId,
      }
      await createReminder(input)
      logActivity(tripId, meId, 'reminder_set', `為「${targetName}」設定了${templateInfo(template).label}`)
      onCreated()
    } catch (e) {
      setSaveError(errMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const segClass = (active: boolean) =>
    `flex-1 rounded-md py-[7px] text-[13px] font-semibold transition-colors ${
      active ? 'bg-white text-primary-deep shadow-1' : 'text-ink-3'
    }`
  const timeInputClass =
    'num rounded-md border border-line-strong bg-surface-2 px-2 py-[6px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white'

  return (
    <Sheet onClose={onClose} stacked>
      {/* flex + min-h-0：欄位多，小螢幕（尤其鍵盤彈出）時中段可捲、儲存鈕不被推出畫面 */}
      <div className="flex max-h-full flex-col px-[22px] pb-[28px] pt-2">
        <h3 className="text-[17px] font-bold text-ink">新增提醒</h3>

        <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 模板選擇 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {REMINDER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTemplateChange(t.id)}
              className={`flex items-center gap-[6px] rounded-full px-[13px] py-[7px] text-[13px] font-semibold active:scale-95 ${
                template === t.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-ink-2'
              }`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* 提醒時間：提前事件 / 指定時刻 */}
        <div className="mt-4">
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
            <button type="button" onClick={() => setMode('offset')} className={segClass(mode === 'offset')}>
              提前提醒
            </button>
            <button type="button" onClick={() => setMode('absolute')} className={segClass(mode === 'absolute')}>
              指定時刻
            </button>
          </div>

          {mode === 'offset' ? (
            <div className="mt-3">
              <div className="flex flex-wrap gap-[6px]">
                {OFFSET_OPTIONS.map((opt) => (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => {
                      setCustomOffset(false)
                      setOffsetMin(opt.minutes)
                    }}
                    className={`rounded-full px-[11px] py-[5px] text-[12.5px] font-semibold active:scale-95 ${
                      !customOffset && offsetMin === opt.minutes
                        ? 'bg-primary text-white'
                        : 'bg-line text-ink-3'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomOffset(true)}
                  className={`rounded-full px-[11px] py-[5px] text-[12.5px] font-semibold active:scale-95 ${
                    customOffset ? 'bg-primary text-white' : 'bg-line text-ink-3'
                  }`}
                >
                  自訂
                </button>
              </div>

              {customOffset && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[13px] text-ink-3">提前</span>
                  <input
                    inputMode="numeric"
                    value={customNum}
                    onChange={(e) => setCustomNum(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="數字"
                    className={`${timeInputClass} w-[80px]`}
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as 'min' | 'hour' | 'day')}
                    className="rounded-md border border-line-strong bg-surface-2 px-2 py-[7px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
                  >
                    <option value="min">分鐘</option>
                    <option value="hour">小時</option>
                    <option value="day">天</option>
                  </select>
                  <span className="text-[13px] text-ink-3">前</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-ink-3">日期</span>
                <input
                  type="date"
                  value={absDate}
                  onChange={(e) => setAbsDate(e.target.value)}
                  className={timeInputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-ink-3">時間</span>
                <Time24Field
                  value={absTime}
                  onChange={setAbsTime}
                  onCommit={setAbsTime}
                  className={`${timeInputClass} w-[84px] text-center`}
                  ariaLabel="提醒時間"
                />
              </label>
            </div>
          )}
        </div>

        {/* 觸發時間預覽 */}
        {fireDisplay && !offsetInvalid && (
          <div className="mt-3 rounded-lg bg-warn-soft/50 px-3 py-[10px]">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#b9762a]">
              <Icon name="bell" size={14} />
              將在 {fireDisplay} 提醒
            </p>
            {firePast && (
              <p className="mt-1 text-[12.5px] font-semibold text-danger">
                這個時間已經過去，請往後調整才能儲存
              </p>
            )}
          </div>
        )}

        {/* 自訂訊息 */}
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-ink-3">備註訊息（選填）</p>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例如：記得帶訂位編號"
            className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-primary focus:bg-white"
          />
        </div>
        </div>

        {saveError && (
          <div className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-[#b9762a]">
            {saveError}
          </div>
        )}

        {/* 儲存 */}
        <button
          type="button"
          disabled={saving || !fireAtAdjusted || offsetInvalid || firePast}
          onClick={() => void handleSave()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-[14px] text-base font-bold text-white shadow-[0_6px_16px_rgba(122,108,240,0.35)] active:scale-[0.98] disabled:opacity-60"
        >
          <Icon name="check" size={16} /> 儲存提醒
        </button>
      </div>
    </Sheet>
  )
}
