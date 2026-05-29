// Telegram Bot API wrapper

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode?: 'HTML' | 'Markdown'
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
    }
    if (parseMode) {
      body.parse_mode = parseMode
    }

    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[Telegram] sendMessage failed', { chatId, status: res.status, err })
      return false
    }

    return true
  } catch (err) {
    console.error('[Telegram] sendMessage error', err)
    return false
  }
}

export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const body: Record<string, unknown> = { url: webhookUrl }
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
      body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET
    }

    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[Telegram] setWebhook failed', { status: res.status, err })
      return false
    }

    return true
  } catch (err) {
    console.error('[Telegram] setWebhook error', err)
    return false
  }
}

export function formatPaymentAlert(payment: {
  concept: string
  amount: number
  currency: string
  payer_name?: string
}): string {
  const lines = [
    '💰 <b>Pago confirmado</b>',
    '',
    `Concepto: ${payment.concept}`,
    `Monto: ${payment.currency} ${payment.amount}`,
  ]
  if (payment.payer_name) {
    lines.push(`Pagador: ${payment.payer_name}`)
  }
  return lines.join('\n')
}

export function formatTaxAlert(obligation: {
  tax_type: string
  period: string
  due_date: string
  days_until: number
}): string {
  return [
    '⚠️ <b>Vencimiento tributario próximo</b>',
    '',
    `${obligation.tax_type} período ${obligation.period}`,
    `Vence: ${obligation.due_date}`,
    `Faltan: ${obligation.days_until} días`,
  ].join('\n')
}

export function formatTodoDueAlert(todo: { title: string; due_date: string }): string {
  return ['📋 <b>Tarea pendiente</b>', '', todo.title, 'Vence hoy'].join('\n')
}

export async function getTelegramBotInfo(): Promise<{ username: string; first_name: string } | null> {
  try {
    const res = await fetch(`${TELEGRAM_API}/getMe`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.ok) return null
    return { username: data.result.username, first_name: data.result.first_name }
  } catch (err) {
    console.error('[Telegram] getMe error', err)
    return null
  }
}

export async function sendTelegramMessageWithButtons(
  chatId: string,
  text: string,
  buttons: Array<Array<{ text: string; callback_data: string }>>
): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[Telegram] sendMessageWithButtons failed', { chatId, status: res.status, err })
      return false
    }

    return true
  } catch (err) {
    console.error('[Telegram] sendMessageWithButtons error', err)
    return false
  }
}

export function formatDailySummary(data: {
  pendingPayments: number
  pendingAmount: number
  currency: string
  upcomingTaxes: Array<{ taxType: string; daysUntil: number }>
  openTodos: number
}): string {
  const lines: string[] = [
    '📊 *Resumen del día*',
    '',
    `💰 Pagos pendientes: ${data.pendingPayments} (${data.currency} ${data.pendingAmount.toLocaleString('es-BO')})`,
    `📋 Tareas abiertas: ${data.openTodos}`,
  ]

  if (data.upcomingTaxes.length > 0) {
    lines.push('⚠️ Vencimientos próximos:')
    for (const tax of data.upcomingTaxes) {
      lines.push(`  • ${tax.taxType} — ${tax.daysUntil} días`)
    }
  }

  lines.push('')
  lines.push('Buen día desde Alfred 🤵')

  return lines.join('\n')
}
