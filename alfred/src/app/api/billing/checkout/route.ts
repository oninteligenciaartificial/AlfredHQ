import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { AppError, handleApiError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { auditLog } from '@/lib/audit'
import * as repo from '@/lib/payments/repository'

const checkoutSchema = z.object({
  workspaceId: z.string().uuid(),
})

const PLAN_AMOUNT_BOB = 350
const BANK_DETAILS = {
  bank: 'Banco Unión',
  account: '1234567890',
  owner: 'OnIA Digital SRL',
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const { workspaceId } = checkoutSchema.parse(body)

    await getUserWorkspace(user.id, workspaceId)

    const timestamp = Date.now()
    const reference = `ALFRED-${workspaceId.slice(0, 8).toUpperCase()}-${timestamp}`

    const supabase = await createClient()
    await repo.create(supabase, workspaceId, {
      concept: 'Suscripción Alfred Pro — mensual',
      amount: PLAN_AMOUNT_BOB,
      currency: 'BOB',
      method: 'qr',
      source: 'api',
      external_ref: reference,
    })

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'TASK_CREATE',
      resource: reference,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
      details: { type: 'billing_checkout_initiated' },
    })

    return NextResponse.json({
      success: true,
      reference,
      amount: PLAN_AMOUNT_BOB,
      currency: 'BOB',
      instructions: {
        ...BANK_DETAILS,
        reference,
        amount: PLAN_AMOUNT_BOB,
        currency: 'BOB',
        description: 'Incluir la referencia exacta en el detalle de la transferencia.',
      },
    })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
