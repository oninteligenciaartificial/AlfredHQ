import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotesClient, type Todo, type Note } from './notes-client'

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  const workspace = ws as { id: string } | null
  if (!workspace) redirect('/dashboard')

  const [{ data: todosData }, { data: notesData }] = await Promise.all([
    supabase
      .from('todos')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false }),
    supabase
      .from('notes')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false }),
  ])

  return (
    <NotesClient
      initialTodos={(todosData ?? []) as unknown as Todo[]}
      initialNotes={(notesData ?? []) as unknown as Note[]}
      workspaceId={workspace.id}
    />
  )
}
