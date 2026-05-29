import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { handleApiError, AppError } from '@/lib/security/error-handler'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    const businessId = searchParams.get('business_id')
    const status = searchParams.get('status')
    const year = searchParams.get('year')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('tax_obligations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true })

    if (businessId) query = query.eq('business_id', businessId)
    if (status) query = query.eq('status', status)
    if (year) {
      query = query.gte('due_date', `${year}-01-01`).lte('due_date', `${year}-12-31`)
    }

    const { data, error } = await query
    if (error) throw new AppError((error as Error).message, 500, 'FETCH_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const { workspace_id, business_id, tax_type, period, due_date, notes } = body

    if (!workspace_id) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')
    if (!tax_type || !period || !due_date) {
      throw new AppError('tax_type, period and due_date required', 400, 'MISSING_PARAM')
    }
    await getUserWorkspace(user.id, workspace_id)

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('tax_obligations')
      .insert({ workspace_id, business_id, tax_type, period, due_date, notes })
      .select()
      .single()

    if (error) throw new AppError((error as Error).message, 500, 'INSERT_FAILED')

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
