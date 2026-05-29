export type TaxRegime = 'general' | 'simplificado' | 'rc_iva'
export type NotificationChannelType = 'telegram' | 'discord' | 'whatsapp'

export type Business = {
  id: string
  workspace_id: string
  name: string
  nit?: string
  tax_regime?: TaxRegime
  currency: string
  is_active: boolean
  created_at: string
}

export type NotificationChannel = {
  id: string
  workspace_id: string
  type: NotificationChannelType
  target: string
  label: string
  is_active: boolean
  created_at: string
}

export type ApiKey = {
  id: string
  workspace_id: string
  name: string
  key_prefix: string
  key_hash: string
  scopes: string[]
  last_used_at?: string
  revoked_at?: string
  created_at: string
}

export type Payment = {
  id: string
  workspace_id: string
  concept: string
  amount: number
  currency: string
  payer_name?: string
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
}

export type TaxObligation = {
  id: string
  workspace_id: string
  tax_type: string
  period: string
  due_date: string
  days_until: number
  status: 'pending' | 'submitted' | 'overdue'
}

export type Todo = {
  id: string
  workspace_id: string
  title: string
  due_date: string
  is_completed: boolean
  created_at: string
}

export type CreateBusinessInput = {
  name: string
  nit?: string
  tax_regime?: TaxRegime
  currency?: string
}

export type UpdateBusinessInput = Partial<CreateBusinessInput>
