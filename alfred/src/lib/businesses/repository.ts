import type { SupabaseClient } from '@supabase/supabase-js'
import type { Business, CreateBusinessInput, UpdateBusinessInput } from '@/types/butler'

export async function findAll(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Business[]
}

export async function findById(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as Business
}

export async function create(
  supabase: SupabaseClient,
  workspaceId: string,
  input: CreateBusinessInput
): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      nit: input.nit ?? null,
      tax_regime: input.tax_regime ?? null,
      currency: input.currency ?? 'BOB',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Business
}

export async function update(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string,
  input: UpdateBusinessInput
): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.nit !== undefined && { nit: input.nit }),
      ...(input.tax_regime !== undefined && { tax_regime: input.tax_regime }),
      ...(input.currency !== undefined && { currency: input.currency }),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Business
}

export async function softDelete(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .update({ is_active: false })
    .eq('workspace_id', workspaceId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
