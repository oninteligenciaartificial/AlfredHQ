'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyTask, TaskStatus } from '@/types'

interface UseTasksReturn {
  tasks: DailyTask[]
  loading: boolean
  error: string | null
  updateStatus: (id: string, status: TaskStatus) => Promise<void>
  addTask: (task: { type: string; title: string; description?: string; network?: string | null; priority?: number }) => Promise<void>
  refetch: () => Promise<void>
}

export function useTasks(workspaceId: string | null): UseTasksReturn {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { data, error: err } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('date', today)
        .order('priority', { ascending: false })

      if (err) throw new Error(err.message)
      setTasks(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    if (!workspaceId) return
    const supabase = createClient()
    const { error: err } = await supabase
      .from('daily_tasks')
      .update({ status } as never)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (err) throw new Error(err.message)
    await fetchTasks()
  }, [workspaceId, fetchTasks])

  const addTask = useCallback(async (task: { type: string; title: string; description?: string; network?: string | null; priority?: number }) => {
    if (!workspaceId) return
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { error: err } = await supabase
      .from('daily_tasks')
      .insert({
        ...task,
        workspace_id: workspaceId,
        date: today,
        status: 'pending',
        agent_generated: false,
      } as never)

    if (err) throw new Error(err.message)
    await fetchTasks()
  }, [workspaceId, fetchTasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, updateStatus, addTask, refetch: fetchTasks }
}
