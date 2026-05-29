import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSocialAccounts } from '@/lib/supabase/social-queries'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace, error: wsError } = await (supabase as any)
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json([], { status: 200 })
    }

    const accounts = await getSocialAccounts(supabase, (workspace as { id: string }).id)
    return NextResponse.json(accounts)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
