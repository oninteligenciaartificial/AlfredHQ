import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { SocialAccount } from '@/types'

type DbClient = SupabaseClient<Database>

export async function getSocialAccounts(
  supabase: DbClient,
  workspaceId: string
): Promise<SocialAccount[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('social_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    workspace_id: row.workspace_id ?? '',
    network: row.network as SocialAccount['network'],
    account_id: row.account_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    is_active: row.is_active ?? true,
    connected_at: row.connected_at ?? '',
  }))
}

export async function disconnectSocialAccount(
  supabase: DbClient,
  workspaceId: string,
  network: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('social_accounts')
    .update({ is_active: false })
    .eq('workspace_id', workspaceId)
    .eq('network', network)

  if (error) throw new Error(error.message)
}
