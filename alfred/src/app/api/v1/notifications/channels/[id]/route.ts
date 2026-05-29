import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    const workspace = ws as { id: string } | null
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    try {
      const { error } = await (supabase
        .from('notification_channels') as ReturnType<typeof supabase.from>)
        .update({ is_active: false } as never)
        .eq('id', id)
        .eq('workspace_id', workspace.id)

      if (error) throw error
    } catch {
      return NextResponse.json({ error: 'Failed to deactivate channel' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('[channels DELETE] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
