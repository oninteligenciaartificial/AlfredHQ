import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { AppError, handleApiError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { auditLog } from '@/lib/audit'
import * as repo from '@/lib/payments/repository'

const createSchema = z.object({
  concept: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('BOB'),
  payer_name: z.string().optional(),
  method: z.enum(['efectivo', 'transferencia', 'qr', 'tarjeta', 'otro']).optional(),
  notes: z.string().optional(),
  business_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    await getUserWorkspace(user.id, workspaceId)

    const status = searchParams.get('status') as repo.PaymentStatus | null
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined
    const businessId = searchParams.get('business_id') ?? undefined
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

    const supabase = await createClient()
    const payments = await repo.findAll(supabase, workspaceId, {
      status: status ?? undefined,
      from,
      to,
      businessId,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: payments,
      meta: { page, limit },
    })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    await getUserWorkspace(user.id, workspaceId)

    const body = await request.json()
    const validated = createSchema.parse(body)

    const supabase = await createClient()
    const payment = await repo.create(supabase, workspaceId, validated)

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'TASK_CREATE',
      resource: payment.id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
