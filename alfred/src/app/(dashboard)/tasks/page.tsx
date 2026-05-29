import { createClient } from '@/lib/supabase/server'
import { getOrCreateWorkspace } from '@/lib/supabase/workspace'
import { getTodayTasks } from '@/lib/supabase/queries'
import { redirect } from 'next/navigation'
import { TasksPageClient } from './tasks-page-client'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const workspace = await getOrCreateWorkspace(user.id)
  const tasks = await getTodayTasks(workspace.id)

  return <TasksPageClient initialTasks={tasks} workspaceId={workspace.id} />
}
