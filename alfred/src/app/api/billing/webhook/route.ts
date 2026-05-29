import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { auditLog } from '@/lib/audit'

// Minimal Stripe event types we handle
type StripeSubscriptionObject = {
  id: string
  customer: string
  status?: string
  metadata?: Record<string, string>
}

type StripeEvent = {
  id: string
  type: string
  data: { object: StripeSubscriptionObject }
}

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: '2025-04-30.basil' as any,
  })
}

function verifyStripeSignature(
  payload: string,
  sig: string | null,
  secret: string
): StripeEvent {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(payload, sig ?? '', secret) as unknown as StripeEvent
}

function planFromStatus(status: string | undefined): 'starter' | 'pro' {
  if (status === 'active' || status === 'trialing') return 'pro'
  return 'starter'
}

async function updateWorkspacePlan(workspaceId: string, plan: string) {
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('workspaces') as any)
    .update({ plan })
    .eq('id', workspaceId)
  return error
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[billing/webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  let event: StripeEvent

  try {
    event = verifyStripeSignature(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('[billing/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const workspaceId = sub.metadata?.workspace_id
        const plan = planFromStatus(sub.status)

        if (!workspaceId) {
          console.warn('[billing/webhook] No workspace_id in metadata', sub.id)
          break
        }

        const updateErr = await updateWorkspacePlan(workspaceId, plan)
        if (updateErr) {
          console.error('[billing/webhook] Failed to update plan:', updateErr)
        } else {
          await auditLog({
            level: 'info',
            userId: null,
            workspaceId,
            action: 'WORKSPACE_CREATE',
            resource: sub.id,
            result: 'success',
            ip: null,
            userAgent: null,
            requestId: event.id,
            details: { stripe_event: event.type, plan },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const workspaceId = sub.metadata?.workspace_id

        if (!workspaceId) {
          console.warn('[billing/webhook] No workspace_id in metadata', sub.id)
          break
        }

        const updateErr = await updateWorkspacePlan(workspaceId, 'starter')
        if (updateErr) {
          console.error('[billing/webhook] Failed to downgrade plan:', updateErr)
        } else {
          await auditLog({
            level: 'warn',
            userId: null,
            workspaceId,
            action: 'WORKSPACE_CREATE',
            resource: sub.id,
            result: 'success',
            ip: null,
            userAgent: null,
            requestId: event.id,
            details: { stripe_event: event.type, plan: 'starter' },
          })
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[billing/webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
