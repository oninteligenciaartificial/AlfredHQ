import { createClient } from '@/lib/supabase/server'
import { getOrCreateWorkspace } from '@/lib/supabase/workspace'
import { getGoals } from '@/lib/supabase/queries'
import { redirect } from 'next/navigation'
import { GoalsPageClient } from './goals-client'

export default async function SettingsGoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const workspace = await getOrCreateWorkspace(user.id)
  const goals = await getGoals(workspace.id)

  return <GoalsPageClient initialGoals={goals} workspaceId={workspace.id} />
}
