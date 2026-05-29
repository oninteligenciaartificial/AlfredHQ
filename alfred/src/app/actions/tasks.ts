'use server'

import { revalidatePath } from 'next/cache'
import { updateTaskStatus, createTask } from '@/lib/supabase/queries'
import type { TaskType, Network } from '@/types'

export async function completeTaskAction(taskId: string): Promise<void> {
  await updateTaskStatus(taskId, 'done')
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function skipTaskAction(taskId: string): Promise<void> {
  await updateTaskStatus(taskId, 'skipped')
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function createTaskAction(data: {
  workspaceId: string
  type: TaskType
  title: string
  description?: string
  network?: Network | null
  priority?: number
}): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  await createTask(data.workspaceId, {
    workspace_id: data.workspaceId,
    date: today,
    type: data.type,
    title: data.title,
    description: data.description ?? null,
    network: data.network ?? null,
    priority: data.priority ?? null,
    status: 'pending',
    agent_generated: false,
    goal_id: null,
  })

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}
