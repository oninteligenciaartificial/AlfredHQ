import type { SupabaseClient } from '@supabase/supabase-js'
import type { Payment, TaxObligation, Todo } from '@/types/butler'
import { sendTelegramMessage, formatPaymentAlert, formatTaxAlert, formatTodoDueAlert } from './telegram'
import { sendDiscordMessage } from './discord'

export async function dispatchAlert(
  supabase: SupabaseClient,
  workspaceId: string,
  message: string
): Promise<void> {
  try {
    const { data: channels, error } = await supabase
      .from('notification_channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    if (error || !channels) {
      console.error('[dispatch] Failed to fetch channels', error)
      return
    }

    for (const channel of channels) {
      try {
        if (channel.type === 'telegram') {
          await sendTelegramMessage(channel.target, message, 'HTML')
        } else if (channel.type === 'discord') {
          await sendDiscordMessage(channel.target, message)
        }
      } catch (err) {
        console.error('[dispatch] Failed to send to channel', { channelId: channel.id, err })
      }
    }
  } catch (err) {
    console.error('[dispatch] dispatchAlert error', err)
  }
}

export async function dispatchPaymentConfirmed(
  supabase: SupabaseClient,
  workspaceId: string,
  payment: Payment
): Promise<void> {
  const message = formatPaymentAlert({
    concept: payment.concept,
    amount: payment.amount,
    currency: payment.currency,
    payer_name: payment.payer_name,
  })
  await dispatchAlert(supabase, workspaceId, message)
}

export async function dispatchTaxDueSoon(
  supabase: SupabaseClient,
  workspaceId: string,
  obligation: TaxObligation
): Promise<void> {
  const message = formatTaxAlert({
    tax_type: obligation.tax_type,
    period: obligation.period,
    due_date: obligation.due_date,
    days_until: obligation.days_until,
  })
  await dispatchAlert(supabase, workspaceId, message)
}

export async function dispatchTodoDue(
  supabase: SupabaseClient,
  workspaceId: string,
  todo: Todo
): Promise<void> {
  const message = formatTodoDueAlert({
    title: todo.title,
    due_date: todo.due_date,
  })
  await dispatchAlert(supabase, workspaceId, message)
}
