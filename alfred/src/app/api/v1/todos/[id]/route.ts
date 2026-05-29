import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { handleApiError, AppError } from '@/lib/security/error-handler'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveWorkspace(sb: any, id: string): Promise<string> {
  const { data, error } = await sb.from('todos').select('workspace_id').eq('id', id).single()
  if (error || !data) throw new AppError('Todo not found', 404, 'NOT_FOUND')
  return (data as { workspace_id: string }).workspace_id
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const workspaceId = await resolveWorkspace(sb, id)
    await getUserWorkspace(user.id, workspaceId)

    const { data, error } = await sb.from('todos').select('*').eq('id', id).single()
    if (error) throw new AppError((error as Error).message, 500, 'FETCH_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const workspaceId = await resolveWorkspace(sb, id)
    await getUserWorkspace(user.id, workspaceId)

    const allowed = ['title', 'notes', 'due_date', 'priority', 'status']
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { data, error } = await sb.from('todos').update(updates).eq('id', id).select().single()
    if (error) throw new AppError((error as Error).message, 500, 'UPDATE_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const workspaceId = await resolveWorkspace(sb, id)
    await getUserWorkspace(user.id, workspaceId)

    const { error } = await sb.from('todos').delete().eq('id', id)
    if (error) throw new AppError((error as Error).message, 500, 'DELETE_FAILED')

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
