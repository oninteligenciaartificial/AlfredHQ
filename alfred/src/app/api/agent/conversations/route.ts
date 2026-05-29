import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('agent_conversations')
      .select('id, role, content, tool_calls, agent_mode, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (err) throw new AppError(err.message, 500, 'FETCH_FAILED')

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
