import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { handleApiError, AppError } from '@/lib/security/error-handler'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params
    const body = await request.json()
    const { filed_at, filed_amount, notes } = body

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: obligation, error: fetchError } = await sb
      .from('tax_obligations')
      .select('workspace_id')
      .eq('id', id)
      .single()

    if (fetchError || !obligation) throw new AppError('Obligation not found', 404, 'NOT_FOUND')
    await getUserWorkspace(user.id, (obligation as { workspace_id: string }).workspace_id)

    const { data, error } = await sb
      .from('tax_obligations')
      .update({
        status: 'filed',
        filed_at: filed_at ?? new Date().toISOString(),
        filed_amount: filed_amount ?? null,
        notes: notes ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new AppError((error as Error).message, 500, 'UPDATE_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
