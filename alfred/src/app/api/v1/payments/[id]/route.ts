import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { AppError, handleApiError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { auditLog } from '@/lib/audit'
import * as repo from '@/lib/payments/repository'

const updateSchema = z.object({
  concept: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  payer_name: z.string().optional(),
  method: z.enum(['efectivo', 'transferencia', 'qr', 'tarjeta', 'otro']).optional(),
  notes: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const { searchParams } = new URL(_request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const payment = await repo.findById(supabase, workspaceId, id)
    if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND')

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    await getUserWorkspace(user.id, workspaceId)

    const body = await request.json()
    const validated = updateSchema.parse(body)

    const supabase = await createClient()
    const payment = await repo.update(supabase, workspaceId, id, validated)

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

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const { searchParams } = new URL(_request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const payment = await repo.update(supabase, workspaceId, id, { status: 'cancelled' })

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

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
