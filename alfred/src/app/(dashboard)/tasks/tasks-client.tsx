'use client'

import { useOptimistic, useTransition } from 'react'
import type { DailyTask, TaskType, Network } from '@/types'
import { CheckCircle2, Circle, SkipForward } from 'lucide-react'
import { completeTaskAction, skipTaskAction } from '@/app/actions/tasks'

const TYPE_COLORS: Record<TaskType, string> = {
  PUBLICAR: 'bg-blue-100 text-blue-700',
  RESPONDER: 'bg-purple-100 text-purple-700',
  ANALIZAR: 'bg-amber-100 text-amber-700',
  OPTIMIZAR: 'bg-green-100 text-green-700',
  CRECER: 'bg-rose-100 text-rose-700',
}

function NetworkIcon({ network }: { network: Network | null }) {
  if (network === 'instagram') return <span className="text-xs font-bold">IG</span>
  if (network === 'linkedin') return <span className="text-xs font-bold">in</span>
  if (network === 'tiktok') return <span className="text-xs font-bold">TT</span>
  return null
}

interface TasksClientProps {
  initialTasks: DailyTask[]
  filter: 'all' | 'pending' | 'done'
}

export function TasksClient({ initialTasks, filter }: TasksClientProps) {
  const [, startTransition] = useTransition()

  const [tasks, setOptimisticTask] = useOptimistic(
    initialTasks,
    (state: DailyTask[], { id, status }: { id: string; status: DailyTask['status'] }) =>
      state.map((t) => (t.id === id ? { ...t, status } : t))
  )

  function handleComplete(taskId: string) {
    startTransition(async () => {
      setOptimisticTask({ id: taskId, status: 'done' })
      await completeTaskAction(taskId)
    })
  }

  function handleSkip(taskId: string) {
    startTransition(async () => {
      setOptimisticTask({ id: taskId, status: 'skipped' })
      await skipTaskAction(taskId)
    })
  }

  const filtered = tasks.filter((t) =>
    filter === 'all' ? true : t.status === filter
  )

  return (
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
              onClick={() => handleComplete(task.id)}
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
                onClick={() => handleSkip(task.id)}
                className="flex-shrink-0 text-zinc-300 hover:text-zinc-500"
                title="Omitir"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}

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
