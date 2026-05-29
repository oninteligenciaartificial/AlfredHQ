'use server'

import { revalidatePath } from 'next/cache'
import { createGoal, deleteGoal } from '@/lib/supabase/queries'
import type { Network, GoalMetric } from '@/types'

export async function createGoalAction(data: {
  workspaceId: string
  network?: Network | null
  metric: GoalMetric
  current_value?: number | null
  target_value: number
  deadline?: string | null
}): Promise<void> {
  await createGoal(data.workspaceId, {
    workspace_id: data.workspaceId,
    network: data.network ?? null,
    metric: data.metric,
    current_value: data.current_value ?? null,
    target_value: data.target_value,
    deadline: data.deadline ?? null,
    is_active: true,
  })

  revalidatePath('/settings/goals')
}

export async function deleteGoalAction(goalId: string): Promise<void> {
  await deleteGoal(goalId)
  revalidatePath('/settings/goals')
}
