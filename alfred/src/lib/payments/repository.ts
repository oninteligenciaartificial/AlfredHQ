import type { SupabaseClient } from '@supabase/supabase-js'

export type PaymentStatus = 'pending' | 'confirmed' | 'refunded' | 'cancelled'
export type PaymentMethod = 'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'otro'
export type PaymentSource = 'manual' | 'api' | 'qr' | 'dentagest'

export interface Payment {
  id: string
  workspace_id: string
  business_id: string | null
  concept: string
  amount: number
  currency: string
  payer_name: string | null
  method: PaymentMethod | null
  status: PaymentStatus
  external_ref: string | null
  source: PaymentSource
  notes: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface CreatePaymentData {
  concept: string
  amount: number
  currency?: string
  payer_name?: string
  method?: PaymentMethod
  notes?: string
  business_id?: string
  external_ref?: string
  source?: PaymentSource
}

export interface UpdatePaymentData {
  concept?: string
  amount?: number
  currency?: string
  payer_name?: string
  method?: PaymentMethod
  notes?: string
  status?: PaymentStatus
}

export interface PaymentFilters {
  status?: PaymentStatus
  from?: string
  to?: string
  businessId?: string
  limit?: number
  page?: number
}

export interface PaymentSummary {
  totalMonth: number
  pendingCount: number
  pendingAmount: number
  confirmedThisWeek: number
}

export async function findAll(
  supabase: SupabaseClient,
  workspaceId: string,
  filters: PaymentFilters = {}
): Promise<Payment[]> {
  const { status, from, to, businessId, limit = 50, page = 1 } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from('payments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (businessId) query = query.eq('business_id', businessId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Payment[]
}

export async function findById(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string
): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single()

  if (error) return null
  return data as Payment
}

export async function create(
  supabase: SupabaseClient,
  workspaceId: string,
  data: CreatePaymentData
): Promise<Payment> {
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      workspace_id: workspaceId,
      concept: data.concept,
      amount: data.amount,
      currency: data.currency ?? 'BOB',
      payer_name: data.payer_name ?? null,
      method: data.method ?? null,
      notes: data.notes ?? null,
      business_id: data.business_id ?? null,
      external_ref: data.external_ref ?? null,
      source: data.source ?? 'manual',
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return payment as Payment
}

export async function update(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string,
  data: UpdatePaymentData
): Promise<Payment> {
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return payment as Payment
}

export async function confirm(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string
): Promise<Payment> {
  const { data: payment, error } = await supabase
    .from('payments')
    .update({
      status: 'confirmed',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return payment as Payment
}

export async function summarize(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<PaymentSummary> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [monthRes, pendingRes, weekRes] = await Promise.all([
    supabase
      .from('payments')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .eq('status', 'confirmed')
      .gte('paid_at', monthStart),
    supabase
      .from('payments')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending'),
    supabase
      .from('payments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'confirmed')
      .gte('paid_at', weekStart),
  ])

  const totalMonth = (monthRes.data ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  const pendingCount = (pendingRes.data ?? []).length
  const pendingAmount = (pendingRes.data ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  const confirmedThisWeek = (weekRes.data ?? []).length

  return { totalMonth, pendingCount, pendingAmount, confirmedThisWeek }
}
