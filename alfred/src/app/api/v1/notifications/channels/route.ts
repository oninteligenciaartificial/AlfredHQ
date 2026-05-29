import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NotificationChannel, NotificationChannelType } from '@/types/butler'

function maskTarget(target: string): string {
  if (target.length <= 4) return '****'
  return '*'.repeat(target.length - 4) + target.slice(-4)
}

export async function GET(): Promise<NextResponse> {
  try {
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
      return NextResponse.json({ data: [] })
    }

    let channels: NotificationChannel[] = []
    try {
      const { data, error } = await (supabase
        .from('notification_channels') as ReturnType<typeof supabase.from>)
        .select('id, type, label, target, is_active, created_at, workspace_id')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      channels = (data as NotificationChannel[] | null) ?? []
    } catch {
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
    }

    const masked = channels.map(ch => ({ ...ch, target: maskTarget(ch.target) }))
    return NextResponse.json({ data: masked })
  } catch (err) {
    console.error('[channels GET] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, target, label } = body as {
      type: NotificationChannelType
      target: string
      label: string
    }

    if (!type || !target || !label) {
      return NextResponse.json({ error: 'type, target, and label are required' }, { status: 400 })
    }

    const validTypes: NotificationChannelType[] = ['telegram', 'discord', 'whatsapp']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
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

    let channel: NotificationChannel | null = null
    try {
      const { data, error } = await (supabase
        .from('notification_channels') as ReturnType<typeof supabase.from>)
        .insert({
          workspace_id: workspace.id,
          type,
          target,
          label,
          is_active: true,
        } as never)
        .select('id, type, label, target, is_active, created_at, workspace_id')
        .single()

      if (error) throw error
      channel = data as NotificationChannel | null
    } catch {
      return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
    }

    if (!channel) {
      return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
    }

    return NextResponse.json(
      { data: { ...channel, target: maskTarget(target) } },
      { status: 201 }
    )
  } catch (err) {
    console.error('[channels POST] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
