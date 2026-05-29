'use client'

import { useState } from 'react'
import type { DailyTask } from '@/types'
import { Plus } from 'lucide-react'
import { TasksClient } from './tasks-client'

interface TasksPageClientProps {
  initialTasks: DailyTask[]
  workspaceId: string
}

export function TasksPageClient({ initialTasks }: TasksPageClientProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  const pending = initialTasks.filter((t) => t.status === 'pending').length
  const done = initialTasks.filter((t) => t.status === 'done').length

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
          style={{ width: `${initialTasks.length ? (done / initialTasks.length) * 100 : 0}%` }}
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

      <TasksClient initialTasks={initialTasks} filter={filter} />
    </div>
  )
}
