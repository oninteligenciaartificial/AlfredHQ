import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { goalSchema } from '@/lib/validation/schemas'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { auditLog } from '@/lib/audit'
import { getCurrentUser, getUserWorkspace, ALLOWED_GOAL_FIELDS, filterAllowedFields } from '@/lib/security/authorization'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('workspace_goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (err) throw new AppError(err.message, 500, 'FETCH_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const validated = goalSchema.parse(body)

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('workspace_goals')
      .insert({
        workspace_id: workspaceId,
        network: validated.network,
        metric: validated.metric,
        target_value: validated.target_value,
        deadline: validated.deadline,
        is_active: true,
      } as never)
      .select()
      .single()

    if (err) throw new AppError(err.message, 500, 'CREATE_FAILED')

    const insertedGoal = data as { id: string }

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'GOAL_CREATE',
      resource: insertedGoal.id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { action: 'GOAL_CREATE' })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const workspaceId = searchParams.get('workspace_id')

    if (!id || !workspaceId) throw new AppError('id and workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const filtered = filterAllowedFields(body, ALLOWED_GOAL_FIELDS)

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('workspace_goals')
      .update(filtered as never)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (err) throw new AppError(err.message, 500, 'UPDATE_FAILED')

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'GOAL_UPDATE',
      resource: id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const workspaceId = searchParams.get('workspace_id')

    if (!id || !workspaceId) throw new AppError('id and workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const { error: err } = await supabase
      .from('workspace_goals')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (err) throw new AppError(err.message, 500, 'DELETE_FAILED')

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'GOAL_UPDATE',
      resource: id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
