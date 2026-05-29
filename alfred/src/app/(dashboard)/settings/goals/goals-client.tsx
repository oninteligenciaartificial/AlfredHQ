'use client'

import { useState, useTransition } from 'react'
import type { WorkspaceGoal, Network, GoalMetric } from '@/types'
import { Plus, Trash2, Target } from 'lucide-react'
import { createGoalAction, deleteGoalAction } from '@/app/actions/goals'

const METRIC_LABELS: Record<GoalMetric, string> = {
  followers: 'Seguidores',
  engagement_rate: 'Engagement rate (%)',
  reach: 'Alcance mensual',
  posts_per_week: 'Posts por semana',
}

const NETWORK_OPTIONS: { value: Network | ''; label: string }[] = [
  { value: '', label: 'Todas las redes' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
]

function GoalProgress({ current, target }: { current: number | null; target: number }) {
  const pct = current != null ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>{current?.toLocaleString() ?? '—'} actual</span>
        <span>{target.toLocaleString()} meta · {Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-100">
        <div
          className="h-1.5 rounded-full bg-zinc-900 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface GoalsPageClientProps {
  initialGoals: WorkspaceGoal[]
  workspaceId: string
}

export function GoalsPageClient({ initialGoals, workspaceId }: GoalsPageClientProps) {
  const [goals, setGoals] = useState<WorkspaceGoal[]>(initialGoals)
  const [showForm, setShowForm] = useState(false)
  const [, startTransition] = useTransition()
  const [form, setForm] = useState<{
    network: Network | ''
    metric: GoalMetric
    current_value: string
    target_value: string
    deadline: string
  }>({
    network: '',
    metric: 'followers',
    current_value: '',
    target_value: '',
    deadline: '',
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.target_value) return

    const optimisticGoal: WorkspaceGoal = {
      id: `optimistic-${Date.now()}`,
      workspace_id: workspaceId,
      network: (form.network || null) as Network | null,
      metric: form.metric,
      current_value: form.current_value ? Number(form.current_value) : null,
      target_value: Number(form.target_value),
      deadline: form.deadline || null,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    setGoals((prev) => [optimisticGoal, ...prev])
    setShowForm(false)
    setForm({ network: '', metric: 'followers', current_value: '', target_value: '', deadline: '' })

    startTransition(async () => {
      await createGoalAction({
        workspaceId,
        network: (form.network || null) as Network | null,
        metric: form.metric,
        current_value: form.current_value ? Number(form.current_value) : null,
        target_value: Number(form.target_value),
        deadline: form.deadline || null,
      })
    })
  }

  function handleDelete(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id))

    startTransition(async () => {
      await deleteGoalAction(id)
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Objetivos</h1>
          <p className="text-zinc-500">Define metas para que Alfred priorice tareas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Nuevo objetivo
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-zinc-300 bg-white p-5 space-y-4"
        >
          <h3 className="font-semibold text-zinc-900">Nuevo objetivo</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Red social</label>
              <select
                value={form.network}
                onChange={(e) => setForm({ ...form, network: e.target.value as Network | '' })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              >
                {NETWORK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Métrica</label>
              <select
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value as GoalMetric })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              >
                {(Object.entries(METRIC_LABELS) as [GoalMetric, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Valor actual</label>
              <input
                type="number"
                value={form.current_value}
                onChange={(e) => setForm({ ...form, current_value: e.target.value })}
                placeholder="Ej: 2840"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Meta *</label>
              <input
                required
                type="number"
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                placeholder="Ej: 5000"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Fecha límite (opcional)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                  <Target className="h-5 w-5 text-zinc-600" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">
                    {METRIC_LABELS[goal.metric]}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {goal.network
                      ? goal.network.charAt(0).toUpperCase() + goal.network.slice(1)
                      : 'Todas las redes'}
                    {goal.deadline && ` · hasta ${new Date(goal.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(goal.id)}
                className="text-zinc-300 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <GoalProgress current={goal.current_value} target={goal.target_value} />
          </div>
        ))}

        {goals.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center">
            <Target className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Sin objetivos definidos</p>
            <p className="text-xs text-zinc-400 mt-1">
              Agrega metas para que Alfred genere tareas alineadas con tu estrategia
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
