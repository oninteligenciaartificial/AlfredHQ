import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarClient, type TaxObligation, type Business } from './calendar-client'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { year: yearParam } = await searchParams
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  const workspace = ws as { id: string } | null
  if (!workspace) redirect('/dashboard')

  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, nit, tax_regime')
    .eq('workspace_id', workspace.id)
    .eq('is_active', true)

  const businesses = (biz ?? []) as Business[]
  const businessIds = businesses.map((b) => b.id)
  let obligations: TaxObligation[] = []

  if (businessIds.length > 0) {
    const { data } = await supabase
      .from('tax_obligations')
      .select('*')
      .eq('workspace_id', workspace.id)
      .gte('due_date', `${year}-01-01`)
      .lte('due_date', `${year}-12-31`)
      .order('due_date', { ascending: true })

    obligations = (data ?? []) as unknown as TaxObligation[]
  }

  return (
    <CalendarClient
      year={year}
      obligations={obligations}
      businesses={businesses}
      workspaceId={workspace.id}
    />
  )
}
