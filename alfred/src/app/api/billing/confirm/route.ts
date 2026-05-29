import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { AppError, handleApiError } from '@/lib/security/error-handler'
import { getCurrentUser } from '@/lib/security/authorization'
import { auditLog } from '@/lib/audit'
import * as repo from '@/lib/payments/repository'

const confirmSchema = z.object({
  reference: z.string().min(1),
  workspaceId: z.string().uuid(),
})

// TODO: Move admin check to a proper role system once roles are implemented.
function assertAdmin(userEmail: string | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'oninteligenciaartificial@gmail.com'
  if (!userEmail || userEmail !== adminEmail) {
    throw new AppError('Forbidden: admin only', 403, 'FORBIDDEN')
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    assertAdmin(user.email)

    const body = await request.json()
    const { reference, workspaceId } = confirmSchema.parse(body)

    const supabase = await createClient()

    // Find the pending payment by external_ref
    const { data: payments, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('external_ref', reference)
      .eq('status', 'pending')
      .limit(1)

    if (findError) throw new AppError(findError.message, 500, 'DB_ERROR')
    if (!payments || payments.length === 0) {
      throw new AppError('Pending payment not found for this reference', 404, 'NOT_FOUND')
    }

    const payment = payments[0] as repo.Payment

    // Confirm the payment
    await repo.confirm(supabase, workspaceId, payment.id)

    // Upgrade the workspace plan to 'pro'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upgradeError } = await (supabase as any)
      .from('workspaces')
      .update({ plan: 'pro' })
      .eq('id', workspaceId)

    if (upgradeError) throw new AppError(upgradeError.message, 500, 'DB_ERROR')

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'TASK_UPDATE',
      resource: payment.id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
      details: { type: 'billing_payment_confirmed', reference },
    })

    return NextResponse.json({
      success: true,
      message: 'Pago confirmado. El workspace ha sido actualizado a Pro.',
      paymentId: payment.id,
      workspaceId,
    })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
