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
