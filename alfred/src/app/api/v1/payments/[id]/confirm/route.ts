import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppError, handleApiError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { auditLog } from '@/lib/audit'
import * as repo from '@/lib/payments/repository'

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

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
