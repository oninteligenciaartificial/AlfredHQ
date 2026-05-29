import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateWorkspace } from '@/lib/supabase/workspace'
import { WorkspaceProvider } from './workspace-context'
import DashboardNav from './dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const workspace = await getOrCreateWorkspace(user.id)

  return (
    <WorkspaceProvider workspaceId={workspace.id}>
      <div className="flex h-screen bg-zinc-50">
        <DashboardNav workspaceName={workspace.name} />
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  )
}
