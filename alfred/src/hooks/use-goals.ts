'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkspaceGoal, GoalMetric, Network } from '@/types'

interface UseGoalsReturn {
  goals: WorkspaceGoal[]
  loading: boolean
  error: string | null
  addGoal: (goal: { network: Network | null; metric: GoalMetric; target_value: number; deadline: string | null }) => Promise<void>
  updateGoal: (id: string, updates: Partial<WorkspaceGoal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useGoals(workspaceId: string | null): UseGoalsReturn {
  const [goals, setGoals] = useState<WorkspaceGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('workspace_goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (err) throw new Error(err.message)
      setGoals(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const addGoal = useCallback(async (goal: { network: Network | null; metric: GoalMetric; target_value: number; deadline: string | null }) => {
    if (!workspaceId) return
    const supabase = createClient()
    const { error: err } = await supabase
      .from('workspace_goals')
      .insert({ ...goal, workspace_id: workspaceId, is_active: true } as never)

    if (err) throw new Error(err.message)
    await fetchGoals()
  }, [workspaceId, fetchGoals])

  const updateGoal = useCallback(async (id: string, updates: Partial<WorkspaceGoal>) => {
    if (!workspaceId) return
    const supabase = createClient()
    const { error: err } = await supabase
      .from('workspace_goals')
      .update(updates as never)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (err) throw new Error(err.message)
    await fetchGoals()
  }, [workspaceId, fetchGoals])

  const deleteGoal = useCallback(async (id: string) => {
    if (!workspaceId) return
    const supabase = createClient()
    const { error: err } = await supabase
      .from('workspace_goals')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (err) throw new Error(err.message)
    await fetchGoals()
  }, [workspaceId, fetchGoals])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  return { goals, loading, error, addGoal, updateGoal, deleteGoal, refetch: fetchGoals }
}
