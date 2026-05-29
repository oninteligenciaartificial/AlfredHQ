import { createClient } from '@/lib/supabase/server'

type PaymentStatus = 'pending' | 'confirmed' | 'cancelled'
type TaxStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed'

interface Payment {
  id: string
  concept: string
  payer: string
  amount: number
  status: PaymentStatus
  created_at: string
}

interface PaymentSummary {
  pending_count: number
  pending_amount: number
  confirmed_week: number
}

interface TaxObligation {
  id: string
  name: string
  type: string
  due_date: string
  status: TaxStatus
}

interface Todo {
  id: string
  title: string
  due_date: string | null
  status: string
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  const due = new Date(dateStr)
  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function taxUrgencyClass(status: TaxStatus): string {
  if (status === 'overdue') return 'text-[var(--danger)]'
  if (status === 'due_soon') return 'text-[var(--warning)]'
  return 'text-[var(--text-secondary)]'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   'bg-zinc-700 text-zinc-300',
    confirmed: 'bg-[var(--success-bg)] text-[var(--success)]',
    cancelled: 'bg-[var(--danger-bg)] text-[var(--danger)]',
    overdue:   'bg-[var(--danger-bg)] text-[var(--danger)]',
    due_soon:  'bg-[var(--warning-bg)] text-[var(--warning)]',
    upcoming:  'bg-zinc-700 text-zinc-300',
    completed: 'bg-[var(--success-bg)] text-[var(--success)]',
    open:      'bg-zinc-700 text-zinc-300',
  }
  const label: Record<string, string> = {
    pending:   'Pendiente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    overdue:   'Vencido',
    due_soon:  'Próximo',
    upcoming:  'Futuro',
    completed: 'Pagado',
    open:      'Abierta',
  }
  const cls = map[status] ?? 'bg-zinc-700 text-zinc-300'
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label[status] ?? status}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const hour = new Date().getHours()
  const greeting = getGreeting(hour)

  let workspaceId: string | null = null
  let username = 'Alfred'

  if (user) {
    username = user.email?.split('@')[0] ?? 'Alfred'
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    workspaceId = (ws as { id: string } | null)?.id ?? null
  }

  let recentPayments: Payment[] = []
  let paymentSummary: PaymentSummary = { pending_count: 0, pending_amount: 0, confirmed_week: 0 }
  let taxObligations: TaxObligation[] = []
  let todos: Todo[] = []

  if (workspaceId) {
    await Promise.all([
      (async () => {
        try {
          const { data } = await supabase
            .from('payments')
            .select('id, concept, payer, amount, status, created_at')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(5)
          recentPayments = (data as Payment[] | null) ?? []
        } catch { /* table may not exist yet */ }
      })(),
      (async () => {
        try {
          const { data } = await supabase
            .from('payments')
            .select('status, amount, paid_at')
            .eq('workspace_id', workspaceId)
          if (data) {
            const rows = data as Array<{ status: string; amount: number; paid_at: string | null }>
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            paymentSummary = {
              pending_count: rows.filter(r => r.status === 'pending').length,
              pending_amount: rows.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
              confirmed_week: rows.filter(r => r.status === 'confirmed' && r.paid_at && r.paid_at > weekAgo).length,
            }
          }
        } catch { /* table may not exist yet */ }
      })(),
      (async () => {
        try {
          const { data } = await supabase
            .from('tax_obligations')
            .select('id, name, type, due_date, status')
            .eq('workspace_id', workspaceId)
            .in('status', ['upcoming', 'due_soon', 'overdue'])
            .order('due_date', { ascending: true })
            .limit(3)
          taxObligations = (data as TaxObligation[] | null) ?? []
        } catch { /* table may not exist yet */ }
      })(),
      (async () => {
        try {
          const { data } = await supabase
            .from('todos')
            .select('id, title, due_date, status')
            .eq('workspace_id', workspaceId)
            .eq('status', 'open')
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(3)
          todos = (data as Todo[] | null) ?? []
        } catch { /* table may not exist yet */ }
      })(),
    ])
  }

  const nextTax = taxObligations[0]
  const nextTaxDays = nextTax ? daysUntil(nextTax.due_date) : null

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {greeting}, <span className="text-[var(--gold-400)]">{username}</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Aquí está el resumen de tu día.
        </p>
      </div>

      {/* Metric cards */}
      <div className="flex gap-4 overflow-x-auto pb-1">
        {/* Pagos pendientes */}
        <div className="min-w-[200px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gold-400)]">
            Pagos pendientes
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
            {paymentSummary.pending_count}
          </p>
          <p className="mt-1 font-mono text-sm text-[var(--text-secondary)]">
            BOB {paymentSummary.pending_amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Confirmados esta semana */}
        <div className="min-w-[200px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gold-400)]">
            Confirmados (7 días)
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
            {paymentSummary.confirmed_week}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">pagos confirmados</p>
        </div>

        {/* Próximo vencimiento tributario */}
        <div className="min-w-[200px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gold-400)]">
            Próximo vencimiento
          </p>
          {nextTax ? (
            <>
              <p className="mt-2 text-base font-bold text-[var(--text-primary)] truncate">{nextTax.name}</p>
              <p className={`mt-1 text-sm font-medium ${taxUrgencyClass(nextTax.status)}`}>
                {nextTaxDays === 0
                  ? 'Hoy'
                  : nextTaxDays! < 0
                  ? `Vencido hace ${Math.abs(nextTaxDays!)} días`
                  : `En ${nextTaxDays} días`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">Sin obligaciones próximas</p>
          )}
        </div>

        {/* Tareas abiertas */}
        <div className="min-w-[200px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gold-400)]">
            Tareas abiertas
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{todos.length}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">sin completar</p>
        </div>
      </div>

      {/* Two-column section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pagos recientes */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Pagos recientes</h2>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">No hay pagos registrados aún.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{p.concept}</p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">{p.payer}</p>
                  </div>
                  <span className="font-mono text-sm text-[var(--text-primary)] shrink-0">
                    BOB {Number(p.amount).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: tax obligations + todos */}
        <div className="space-y-6">
          {/* Próximos vencimientos */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Próximos vencimientos</h2>
            {taxObligations.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">Sin vencimientos próximos.</p>
            ) : (
              <div className="space-y-3">
                {taxObligations.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {t.type} · {new Date(t.due_date).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tareas pendientes */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Tareas pendientes</h2>
            {todos.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No hay tareas abiertas.</p>
            ) : (
              <div className="space-y-3">
                {todos.map((t) => (
                  <div key={t.id} className="flex items-start gap-3">
                    <div className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--border-strong)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)]">{t.title}</p>
                      {t.due_date && (
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {new Date(t.due_date).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
