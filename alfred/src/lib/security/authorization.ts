// Authorization middleware: Verify workspace ownership on every protected operation

import { createClient } from '@/lib/supabase/server'
import { AppError } from './error-handler'
import { validateId } from './sanitization'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
  }

  return user
}

export async function getUserWorkspace(userId: string, workspaceId: string) {
  const supabase = await createClient()

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single()

  if (error || !workspace) {
    throw new AppError('Workspace not found or access denied', 403, 'FORBIDDEN')
  }

  return workspace
}

export async function verifyResourceOwnership(
  userId: string,
  workspaceId: string,
  table: string,
  resourceId: string
) {
  if (!validateId(workspaceId) || !validateId(resourceId)) {
    throw new AppError('Invalid resource ID', 400, 'INVALID_ID')
  }

  const supabase = await createClient()

  const { data: resource, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', resourceId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !resource) {
    throw new AppError('Resource not found or access denied', 403, 'FORBIDDEN')
  }

  return resource
}

export async function getWorkspaceWithAccounts(workspaceId: string) {
  const supabase = await createClient()

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select(`
      *,
      social_accounts (
        id, network, username, display_name, avatar_url, is_active, connected_at
      )
    `)
    .eq('id', workspaceId)
    .single()

  if (error || !workspace) {
    throw new AppError('Workspace not found', 404, 'NOT_FOUND')
  }

  return workspace
}

// Allowed fields for mass assignment prevention
export const ALLOWED_WORKSPACE_FIELDS = ['name'] as const
export const ALLOWED_GOAL_FIELDS = ['network', 'metric', 'target_value', 'deadline', 'is_active'] as const
export const ALLOWED_TASK_FIELDS = ['status'] as const
export const ALLOWED_POST_FIELDS = ['caption', 'media_urls', 'networks', 'scheduled_at', 'status'] as const

export function filterAllowedFields<T extends Record<string, unknown>>(
  input: T,
  allowed: readonly string[]
): Partial<T> {
  const filtered: Partial<T> = {}
  for (const key of allowed) {
    if (key in input) {
      ;(filtered as Record<string, unknown>)[key] = input[key]
    }
  }
  return filtered
}
