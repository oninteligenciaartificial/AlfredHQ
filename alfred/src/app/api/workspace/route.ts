import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace } = await (supabase as any)
    .from('workspaces')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (!workspace) {
    return Response.json({ error: 'Workspace not found' }, { status: 404 })
  }

  return Response.json({ workspaceId: workspace.id, name: workspace.name })
}
