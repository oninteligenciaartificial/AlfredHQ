import { createClient } from '@/lib/supabase/server'
import type { DailyTask, WorkspaceGoal, TaskStatus } from '@/types'

export async function getTodayTasks(workspaceId: string): Promise<DailyTask[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('date', today)
    .order('priority', { ascending: false })

  return (data ?? []) as DailyTask[]
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  await supabase
    .from('daily_tasks')
    .update({ status })
    .eq('id', taskId)
}

export async function createTask(
  workspaceId: string,
  task: Omit<DailyTask, 'id' | 'created_at'>
): Promise<DailyTask> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data, error } = await supabase
    .from('daily_tasks')
    .insert({ ...task, workspace_id: workspaceId })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error('Failed to create task')
  }

  return data as DailyTask
}

export async function getGoals(workspaceId: string): Promise<WorkspaceGoal[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data } = await supabase
    .from('workspace_goals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (data ?? []) as WorkspaceGoal[]
}

export async function createGoal(
  workspaceId: string,
  goal: Omit<WorkspaceGoal, 'id' | 'created_at'>
): Promise<WorkspaceGoal> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data, error } = await supabase
    .from('workspace_goals')
    .insert({ ...goal, workspace_id: workspaceId })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error('Failed to create goal')
  }

  return data as WorkspaceGoal
}

export async function deleteGoal(goalId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  await supabase
    .from('workspace_goals')
    .update({ is_active: false })
    .eq('id', goalId)
}

export async function getDashboardMetrics(workspaceId: string): Promise<{
  totalFollowers: number
  engagementRate: number
  postsThisWeek: number
  pendingTasksCount: number
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const [followersResult, engagementResult, postsResult, tasksResult] = await Promise.all([
    supabase
      .from('analytics_snapshots')
      .select('network, value, recorded_at')
      .eq('workspace_id', workspaceId)
      .eq('metric_name', 'followers'),
    supabase
      .from('analytics_snapshots')
      .select('network, value, recorded_at')
      .eq('workspace_id', workspaceId)
      .eq('metric_name', 'engagement_rate'),
    supabase
      .from('content_posts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ['published', 'scheduled'])
      .gte('created_at', weekStart.toISOString()),
    supabase
      .from('daily_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('date', today.toISOString().split('T')[0])
      .eq('status', 'pending'),
  ])

  // Get latest follower value per network
  const followersByNetwork = new Map<string, number>()
  for (const row of followersResult.data ?? []) {
    const existing = followersByNetwork.get(row.network)
    if (!existing) {
      followersByNetwork.set(row.network, row.value)
    }
  }
  const totalFollowers = Array.from(followersByNetwork.values()).reduce((sum, v) => sum + v, 0)

  // Get latest engagement rate (average across networks)
  const engagementByNetwork = new Map<string, number>()
  for (const row of engagementResult.data ?? []) {
    if (!engagementByNetwork.has(row.network)) {
      engagementByNetwork.set(row.network, row.value)
    }
  }
  const engagementValues = Array.from(engagementByNetwork.values())
  const engagementRate = engagementValues.length
    ? engagementValues.reduce((sum, v) => sum + v, 0) / engagementValues.length
    : 0

  return {
    totalFollowers,
    engagementRate,
    postsThisWeek: postsResult.count ?? 0,
    pendingTasksCount: tasksResult.count ?? 0,
  }
}
