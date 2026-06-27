// Supabase Edge Function：每分鐘由 pg_cron 呼叫，檢查到期提醒並發送 Web Push。
// 部署：supabase functions deploy check-reminders
// 密鑰：VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY、VAPID_SUBJECT（supabase secrets set ...）

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@cotravel.app'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, serviceRoleKey)

interface Reminder {
  id: string
  trip_id: string
  target_type: string
  target_id: string
  target_name: string
  template: string
  message: string | null
  fire_at: string
  offset_minutes: number
}

interface PushSub {
  endpoint: string
  keys_p256dh: string
  keys_auth: string
}

const TEMPLATE_LABELS: Record<string, string> = {
  restaurant: '餐廳訂位提醒',
  checkin: '線上劃位提醒',
  airport_arrival: '機場提早抵達提醒',
  boarding: '登機提醒',
  checkout: '退房提醒',
  custom: '提醒',
}

Deno.serve(async (req) => {
  // 僅接受 POST（pg_cron 用 net.http_post 呼叫）
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // 查到期且未觸發的提醒
    const { data: dueReminders, error: remErr } = await supabase
      .from('reminders')
      .select('*')
      .lte('fire_at', new Date().toISOString())
      .eq('fired', false)
      .limit(50)

    if (remErr) throw remErr
    if (!dueReminders || dueReminders.length === 0) {
      return Response.json({ processed: 0 })
    }

    let sent = 0
    const firedIds: string[] = []

    for (const reminder of dueReminders as Reminder[]) {
      // 查該趟成員
      const { data: members } = await supabase
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', reminder.trip_id)

      if (!members || members.length === 0) {
        firedIds.push(reminder.id)
        continue
      }

      const userIds = members.map((m: { user_id: string }) => m.user_id)

      // 查所有成員的推播訂閱
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, keys_p256dh, keys_auth')
        .in('user_id', userIds)

      if (!subs || subs.length === 0) {
        firedIds.push(reminder.id)
        continue
      }

      const title = TEMPLATE_LABELS[reminder.template] || '同行提醒'
      const body = reminder.message
        ? `${reminder.target_name}：${reminder.message}`
        : reminder.target_name

      const payload = JSON.stringify({
        title,
        body,
        tag: `reminder-${reminder.id}`,
        url: `/CoTravel/#/trip/${reminder.trip_id}`,
      })

      for (const sub of subs as PushSub[]) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
            },
            payload,
            // urgency high：讓 FCM 用高優先級，穿透 Android Doze（螢幕關閉省電）即時喚醒裝置；
            // TTL 1 小時：到期提醒過久才送已無意義，避免裝置長時間離線後補送過時通知。
            { urgency: 'high', TTL: 3600 },
          )
          sent++
        } catch (pushErr: unknown) {
          const status = (pushErr as { statusCode?: number }).statusCode
          // 410 Gone / 404：訂閱已失效，清除
          if (status === 410 || status === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          } else {
            console.error('[push] 發送失敗', sub.endpoint, pushErr)
          }
        }
      }

      firedIds.push(reminder.id)
    }

    // 標記已觸發
    if (firedIds.length > 0) {
      await supabase
        .from('reminders')
        .update({ fired: true })
        .in('id', firedIds)
    }

    return Response.json({ processed: firedIds.length, sent })
  } catch (err) {
    console.error('[check-reminders] 執行失敗', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
})
