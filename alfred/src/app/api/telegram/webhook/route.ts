import { createClient } from '@/lib/supabase/server'
import { sendTelegramMessage } from '@/lib/notifications/telegram'
import { NextResponse } from 'next/server'

interface TelegramUpdate {
  update_id: number
  message?: {
    chat: { id: number }
    text?: string
    from?: { username?: string }
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const token = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (token !== webhookSecret) {
        return NextResponse.json({ ok: false }, { status: 200 })
      }
    }

    const update: TelegramUpdate = await request.json()
    const message = update.message

    if (!message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.chat.id)
    const text = message.text.trim()

    if (text === '/stop') {
      const supabase = await createClient()
      await (supabase
        .from('notification_channels') as ReturnType<typeof supabase.from>)
        .update({ is_active: false })
        .eq('target', chatId)
        .eq('type', 'telegram')

      await sendTelegramMessage(
        chatId,
        'Has desactivado las notificaciones de Alfred. Envía /start para reactivarlas.',
        'HTML'
      )
      return NextResponse.json({ ok: true })
    }

    if (text === '/start' || text.startsWith('/start ')) {
      const supabase = await createClient()

      // Extract workspace token if provided: /start ws_TOKEN
      const parts = text.split(' ')
      const token = parts[1]

      if (token?.startsWith('ws_')) {
        const workspaceId = token.slice(3)

        // Look up workspace by id
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .single()

        const workspace = ws as { id: string } | null

        if (workspace) {
          await (supabase.from('notification_channels') as ReturnType<typeof supabase.from>)
            .upsert(
              {
                workspace_id: workspace.id,
                type: 'telegram',
                target: chatId,
                label: message.from?.username ? `@${message.from.username}` : `Chat ${chatId}`,
                is_active: true,
              } as never,
              { onConflict: 'workspace_id,type,target' }
            )
        }
      }

      await sendTelegramMessage(
        chatId,
        '¡Hola! Soy Alfred, tu mayordomo. Te enviaré alertas sobre pagos, impuestos y tareas.',
        'HTML'
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[telegram/webhook] error', err)
    // Always return 200 so Telegram doesn't retry
    return NextResponse.json({ ok: true })
  }
}
