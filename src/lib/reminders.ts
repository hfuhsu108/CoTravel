import type { IconName } from '../components/Icon'
import { supabase } from './supabase'
import type { Reminder, ReminderTemplate, ReminderTargetType } from './types'

// 預設模板：各模板的預設偏移量（分鐘）與顯示資訊
export interface TemplateInfo {
  id: ReminderTemplate
  label: string
  icon: IconName
  defaultOffset: number // 預設提前分鐘
}

export const REMINDER_TEMPLATES: TemplateInfo[] = [
  { id: 'restaurant', label: '餐廳訂位', icon: 'food', defaultOffset: 1440 },
  { id: 'checkin', label: '線上劃位', icon: 'planeDep', defaultOffset: 1440 },
  { id: 'airport_arrival', label: '機場提早抵達', icon: 'car', defaultOffset: 180 },
  { id: 'boarding', label: '登機提醒', icon: 'plane', defaultOffset: 120 },
  { id: 'checkout', label: '退房提醒', icon: 'hotel', defaultOffset: 60 },
  { id: 'custom', label: '自訂', icon: 'bell', defaultOffset: 60 },
]

const CUSTOM_TEMPLATE = REMINDER_TEMPLATES.find((t) => t.id === 'custom')!

export function templateInfo(id: ReminderTemplate): TemplateInfo {
  return REMINDER_TEMPLATES.find((t) => t.id === id) ?? CUSTOM_TEMPLATE
}

// 常用偏移量選項（UI 下拉選單）
export const OFFSET_OPTIONS = [
  { label: '30 分鐘前', minutes: 30 },
  { label: '1 小時前', minutes: 60 },
  { label: '2 小時前', minutes: 120 },
  { label: '6 小時前', minutes: 360 },
  { label: '12 小時前', minutes: 720 },
  { label: '1 天前', minutes: 1440 },
  { label: '2 天前', minutes: 2880 },
] as const

export async function listReminders(tripId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('trip_id', tripId)
    .order('fire_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Reminder[]
}

export async function listRemindersByTarget(
  targetType: ReminderTargetType,
  targetId: string,
): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('fire_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Reminder[]
}

export interface CreateReminderInput {
  trip_id: string
  target_type: ReminderTargetType
  target_id: string
  target_name: string
  template: ReminderTemplate
  message?: string | null
  fire_at: string // ISO timestamptz（UTC）
  offset_minutes: number
  created_by: string
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as Reminder
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) throw error
}
