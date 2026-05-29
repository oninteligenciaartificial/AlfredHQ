import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { generateYearlyObligations, type Sector } from '@/lib/tax/calendar'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const { business_id, year, nit_last_digit, sector } = body

    if (!business_id || !year || nit_last_digit == null || !sector) {
      throw new AppError('business_id, year, nit_last_digit and sector required', 400, 'MISSING_PARAM')
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: bizData, error: bizError } = await sb
      .from('businesses')
      .select('workspace_id, tax_regime')
      .eq('id', business_id)
      .single()

    if (bizError || !bizData) throw new AppError('Business not found', 404, 'NOT_FOUND')
    const business = bizData as { workspace_id: string; tax_regime: string | null }

    await getUserWorkspace(user.id, business.workspace_id)

    const taxRegime = business.tax_regime ?? 'general'
    const obligations = generateYearlyObligations(
      Number(year),
      Number(nit_last_digit),
      sector as Sector,
      taxRegime,
    )

    const rows = obligations.map((o) => ({
      workspace_id: business.workspace_id,
      business_id,
      tax_type: o.tax_type,
      period: o.period,
      due_date: o.due_date.toISOString().split('T')[0],
    }))

    const { data, error } = await sb
      .from('tax_obligations')
      .upsert(rows, { onConflict: 'business_id,tax_type,period', ignoreDuplicates: true })
      .select()

    if (error) throw new AppError((error as Error).message, 500, 'UPSERT_FAILED')

    return NextResponse.json({ success: true, generated: (data as unknown[])?.length ?? 0 })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
