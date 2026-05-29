import { createClient } from '@/lib/supabase/server'
import {
  sendTelegramMessage,
  formatDailySummary,
} from '@/lib/notifications/telegram'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Runs daily at 08:00 Bolivia time (UTC-4) → 12:00 UTC
// vercel.json schedule: "0 12 * * *"

const MAX_WORKSPACES_PER_RUN = 10

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

    // Fetch active workspaces with a connected Telegram channel
    const { data: channels, error: channelsError } = await (
      supabase
        .from('notification_channels') as ReturnType<typeof supabase.from>
    )
      .select('workspace_id, target')
      .eq('type', 'telegram')
      .eq('is_active', true)
      .limit(MAX_WORKSPACES_PER_RUN)

    if (channelsError) {
      console.error('[cron/daily-summary] fetch channels error', channelsError)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const rows = (channels ?? []) as Array<{ workspace_id: string; target: string }>
    let sent = 0

    for (const { workspace_id, target } of rows) {
      // 1. Pending payments count + amount
      const { data: payments } = await (
        supabase
          .from('payments') as ReturnType<typeof supabase.from>
      )
        .select('amount, currency')
        .eq('workspace_id', workspace_id)
        .eq('status', 'pending')

      const paymentRows = (payments ?? []) as Array<{ amount: number; currency: string }>
      const pendingPayments = paymentRows.length
      const pendingAmount = paymentRows.reduce((sum, p) => sum + (p.amount ?? 0), 0)
      const currency = paymentRows[0]?.currency ?? 'Bs'

      // 2. Upcoming tax obligations in next 14 days
      const { data: taxes } = await (
        supabase
          .from('tax_obligations') as ReturnType<typeof supabase.from>
      )
        .select('tax_type, due_date')
        .eq('workspace_id', workspace_id)
        .in('status', ['upcoming', 'due_soon'])
        .gte('due_date', today)
        .lte('due_date', in14Days)
        .order('due_date', { ascending: true })

      const taxRows = (taxes ?? []) as Array<{ tax_type: string; due_date: string }>
      const upcomingTaxes = taxRows.map(t => {
        const daysUntil = Math.ceil(
          (new Date(t.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        return { taxType: t.tax_type, daysUntil }
      })

      // 3. Open todos due today
      const { data: todos } = await (
        supabase
          .from('todos') as ReturnType<typeof supabase.from>
      )
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('status', 'open')
        .eq('due_date', today)

      const openTodos = (todos ?? []).length

      // 4. Format and send
      const message = formatDailySummary({
        pendingPayments,
        pendingAmount,
        currency,
        upcomingTaxes,
        openTodos,
      })

      const ok = await sendTelegramMessage(target, message, 'Markdown' as never)
      if (ok) sent++
    }

    return NextResponse.json({ ok: true, processed: rows.length, sent })
  } catch (err) {
    console.error('[cron/daily-summary] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
