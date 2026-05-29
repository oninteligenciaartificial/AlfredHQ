import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { taskUpdateSchema } from '@/lib/validation/schemas'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { auditLog } from '@/lib/audit'
import { getCurrentUser, getUserWorkspace, ALLOWED_TASK_FIELDS, filterAllowedFields } from '@/lib/security/authorization'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('date', date)
      .order('priority', { ascending: false })

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
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const today = new Date().toISOString().split('T')[0]

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('daily_tasks')
      .insert({
        workspace_id: workspaceId,
        date: today,
        type: body.type,
        title: body.title,
        description: body.description || null,
        network: body.network || null,
        priority: body.priority || 3,
        status: 'pending',
        agent_generated: false,
      } as never)
      .select()
      .single()

    if (err) throw new AppError(err.message, 500, 'CREATE_FAILED')

    const insertedTask = data as { id: string }

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'TASK_CREATE',
      resource: insertedTask.id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const validated = taskUpdateSchema.parse(body)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const workspaceId = searchParams.get('workspace_id')

    if (!id || !workspaceId) throw new AppError('id and workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const filtered = filterAllowedFields(body, ALLOWED_TASK_FIELDS)

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('daily_tasks')
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
      action: 'TASK_UPDATE',
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
