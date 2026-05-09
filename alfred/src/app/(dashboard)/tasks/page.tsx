'use client'

import { useState } from 'react'
import type { DailyTask, TaskType, Network } from '@/types'
import { CheckCircle2, Circle, SkipForward, Plus } from 'lucide-react'

const TYPE_COLORS: Record<TaskType, string> = {
  PUBLICAR: 'bg-blue-100 text-blue-700',
  RESPONDER: 'bg-purple-100 text-purple-700',
  ANALIZAR: 'bg-amber-100 text-amber-700',
  OPTIMIZAR: 'bg-green-100 text-green-700',
  CRECER: 'bg-rose-100 text-rose-700',
}

const MOCK_TASKS: DailyTask[] = [
  {
    id: '1',
    workspace_id: 'demo',
    date: new Date().toISOString().split('T')[0],
    type: 'PUBLICAR',
    title: 'Publicar post sobre tu servicio estrella',
    description: 'Crea un carrusel mostrando el proceso y resultado. Hora ideal: 12pm.',
    network: 'instagram',
    priority: 5,
    status: 'pending',
    agent_generated: true,
    goal_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    workspace_id: 'demo',
    date: new Date().toISOString().split('T')[0],
    type: 'CRECER',
    title: 'Interactuar con 10 cuentas de tu nicho',
    description: 'Comenta con valor en publicaciones recientes de cuentas similares.',
    network: 'instagram',
    priority: 4,
    status: 'pending',
    agent_generated: true,
    goal_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    workspace_id: 'demo',
    date: new Date().toISOString().split('T')[0],
    type: 'ANALIZAR',
    title: 'Revisar métricas de la semana',
    description: 'Analiza qué contenido generó más engagement y replica el formato.',
    network: null,
    priority: 3,
    status: 'pending',
    agent_generated: true,
    goal_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    workspace_id: 'demo',
    date: new Date().toISOString().split('T')[0],
    type: 'OPTIMIZAR',
    title: 'Actualizar bio de LinkedIn',
    description: 'Agrega tu propuesta de valor clara en las primeras 2 líneas.',
    network: 'linkedin',
    priority: 2,
    status: 'done',
    agent_generated: true,
    goal_id: null,
    created_at: new Date().toISOString(),
  },
]

function NetworkIcon({ network }: { network: Network | null }) {
  if (network === 'instagram') return <span className="text-xs font-bold">IG</span>
  if (network === 'linkedin') return <span className="text-xs font-bold">in</span>
  if (network === 'tiktok') return <span className="text-xs font-bold">TT</span>
  return null
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>(MOCK_TASKS)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  function updateStatus(id: string, status: DailyTask['status']) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    )
  }

  const filtered = tasks.filter((t) =>
    filter === 'all' ? true : t.status === filter
  )

  const pending = tasks.filter((t) => t.status === 'pending').length
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Tareas de hoy</h1>
          <p className="text-sm text-zinc-500">
            {done} completadas · {pending} pendientes
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          <Plus className="h-4 w-4" />
          Nueva tarea
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-zinc-100">
        <div
          className="h-2 rounded-full bg-zinc-900 transition-all"
          style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.map((task) => (
          <div
            key={task.id}
            className={`rounded-xl border bg-white p-4 transition-opacity ${
              task.status === 'done' ? 'opacity-50' : ''
            } ${task.status === 'skipped' ? 'opacity-30' : ''}`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() =>
                  updateStatus(
                    task.id,
                    task.status === 'done' ? 'pending' : 'done'
                  )
                }
                className="mt-0.5 flex-shrink-0 text-zinc-400 hover:text-zinc-900"
              >
                {task.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[task.type]}`}
                  >
                    {task.type}
                  </span>
                  {task.network && (
                    <span className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      <NetworkIcon network={task.network} />
                      {task.network}
                    </span>
                  )}
                  {task.priority && task.priority >= 4 && (
                    <span className="text-xs text-red-500 font-medium">
                      {'●'.repeat(task.priority)} Prioridad {task.priority === 5 ? 'crítica' : 'alta'}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 font-medium text-zinc-900 ${
                    task.status === 'done' ? 'line-through' : ''
                  }`}
                >
                  {task.title}
                </p>

                {task.description && (
                  <p className="mt-1 text-sm text-zinc-500">{task.description}</p>
                )}
              </div>

              {task.status === 'pending' && (
                <button
                  onClick={() => updateStatus(task.id, 'skipped')}
                  className="flex-shrink-0 text-zinc-300 hover:text-zinc-500"
                  title="Omitir"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-500">
            {filter === 'done'
              ? 'Aún no completaste tareas hoy'
              : 'No hay tareas pendientes'}
          </p>
        </div>
      )}
    </div>
  )
}
