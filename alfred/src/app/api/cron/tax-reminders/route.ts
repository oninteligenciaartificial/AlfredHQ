import { createClient } from '@/lib/supabase/server'
import { sendTelegramMessage, formatTaxAlert } from '@/lib/notifications/telegram'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Runs daily at 09:00 Bolivia time (UTC-4) → 13:00 UTC
// vercel.json schedule: "0 13 * * *"

export async function GET(request: Request): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // Fetch obligations that haven't had a reminder sent yet
    const { data: obligations, error } = await (
      supabase
        .from('tax_obligations') as ReturnType<typeof supabase.from>
    )
      .select('id, workspace_id, tax_type, period, due_date')
      .in('status', ['upcoming', 'due_soon'])
      .gte('due_date', today)
      .lte('due_date', in14Days)
      .is('reminder_sent_at', null)

    if (error) {
      console.error('[cron/tax-reminders] fetch obligations error', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const rows = (obligations ?? []) as Array<{
      id: string
      workspace_id: string
      tax_type: string
      period: string
      due_date: string
    }>

    let sent = 0

    for (const obligation of rows) {
      // Find active Telegram channel for this workspace
      const { data: channels } = await (
        supabase
          .from('notification_channels') as ReturnType<typeof supabase.from>
      )
        .select('target')
        .eq('workspace_id', obligation.workspace_id)
        .eq('type', 'telegram')
        .eq('is_active', true)
        .limit(1)

      const channelRows = (channels ?? []) as Array<{ target: string }>
      if (channelRows.length === 0) continue

      const chatId = channelRows[0].target
      const daysUntil = Math.ceil(
        (new Date(obligation.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      const message = formatTaxAlert({
        tax_type: obligation.tax_type,
        period: obligation.period,
        due_date: obligation.due_date,
        days_until: daysUntil,
      })

      const ok = await sendTelegramMessage(chatId, message, 'HTML')

      if (ok) {
        // Mark reminder as sent
        await (
          supabase
            .from('tax_obligations') as ReturnType<typeof supabase.from>
        )
          .update({ reminder_sent_at: new Date().toISOString() } as never)
          .eq('id', obligation.id)

        sent++
      }
    }

    return NextResponse.json({ ok: true, processed: rows.length, sent })
  } catch (err) {
    console.error('[cron/tax-reminders] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
