import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppError, handleApiError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { auditLog } from '@/lib/audit'
import * as repo from '@/lib/payments/repository'
import { dispatchPaymentConfirmed, dispatchPaymentConfirmedEmail } from '@/lib/notifications/dispatch'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const { searchParams } = new URL(_request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const payment = await repo.confirm(supabase, workspaceId, id)

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'TASK_UPDATE',
      resource: id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    // Telegram alert to owner — construct a minimal butler.Payment-shaped object
    await dispatchPaymentConfirmed(supabase, workspaceId, {
      concept: payment.concept,
      amount: payment.amount,
      currency: payment.currency,
      payer_name: payment.payer_name ?? undefined,
    } as import('@/types/butler').Payment)

    // Email receipt to payer (only if payer_email is present on the payment record)
    // payer_email is not yet on the typed Payment interface — access via unknown cast to stay forward-compatible
    const rawPayment = payment as unknown as Record<string, unknown>
    const payerEmail = rawPayment['payer_email']
    if (typeof payerEmail === 'string' && payerEmail.length > 0) {
      await dispatchPaymentConfirmedEmail({
        toEmail: payerEmail,
        payerName: payment.payer_name ?? 'Cliente',
        concept: payment.concept,
        amount: payment.amount,
        currency: payment.currency,
        businessName: (rawPayment['business_name'] as string | undefined) ?? workspaceId,
        paidAt: payment.paid_at ?? new Date().toLocaleDateString('es-BO'),
      })
    }

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
