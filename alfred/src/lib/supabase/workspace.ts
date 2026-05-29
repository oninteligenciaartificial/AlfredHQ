import { createClient } from '@/lib/supabase/server'
import type { Workspace } from '@/types'

export async function getOrCreateWorkspace(userId: string): Promise<Workspace> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: existing } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .single()

  if (existing) {
    return existing as Workspace
  }

  const { data: created, error } = await supabase
    .from('workspaces')
    .insert({ name: 'Mi Workspace', owner_id: userId, plan: 'internal' })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error('Failed to create workspace')
  }

  return created as Workspace
}
