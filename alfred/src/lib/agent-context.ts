import { createClient } from '@/lib/supabase/server'
import type { AgentContext, Network } from '@/types'

export async function buildAgentContext(workspaceId: string): Promise<AgentContext> {
  const supabase = await createClient()

  const [
    { data: accounts },
    { data: goals },
    { data: analytics },
    { data: tasks },
    { data: posts },
  ] = await Promise.all([
    supabase
      .from('social_accounts')
      .select('network')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true),

    supabase
      .from('workspace_goals')
      .select('id, network, metric, current_value, target_value, deadline, is_active')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .limit(10),

    supabase
      .from('analytics_snapshots')
      .select('network, metric_name, value, period_start, period_end')
      .eq('workspace_id', workspaceId)
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(50),

    supabase
      .from('daily_tasks')
      .select('id, type, title, description, network, priority, status, goal_id')
      .eq('workspace_id', workspaceId)
      .eq('date', new Date().toISOString().split('T')[0])
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(10),

    supabase
      .from('content_posts')
      .select('id, caption, networks, status, published_at, metrics_snapshot')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    connected_networks: ((accounts as Array<{ network: string }> | null)?.map(a => a.network) as Network[]) || [],
    goals_summary: (goals as typeof goals extends null ? never[] : typeof goals) || [],
    analytics_summary: (analytics as typeof analytics extends null ? never[] : typeof analytics) || [],
    pending_tasks: (tasks as typeof tasks extends null ? never[] : typeof tasks) || [],
    recent_posts: (posts as typeof posts extends null ? never[] : typeof posts) || [],
  }
}

export async function getDashboardMetrics(workspaceId: string) {
  const supabase = await createClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: accounts },
    { data: tasks },
    { data: posts },
    { data: followersData },
    { data: engagementData },
  ] = await Promise.all([
    supabase
      .from('social_accounts')
      .select('network, username, display_name, avatar_url, is_active')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true),

    supabase
      .from('daily_tasks')
      .select('id, type, title, description, network, priority, status, agent_generated')
      .eq('workspace_id', workspaceId)
      .eq('date', new Date().toISOString().split('T')[0])
      .order('priority', { ascending: false }),

    supabase
      .from('content_posts')
      .select('id, caption, networks, status, scheduled_at, published_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('analytics_snapshots')
      .select('network, value, recorded_at')
      .eq('workspace_id', workspaceId)
      .eq('metric_name', 'followers')
      .gte('recorded_at', sevenDaysAgo)
      .order('recorded_at', { ascending: false })
      .limit(3),

    supabase
      .from('analytics_snapshots')
      .select('network, value, recorded_at')
      .eq('workspace_id', workspaceId)
      .eq('metric_name', 'engagement_rate')
      .gte('recorded_at', sevenDaysAgo)
      .order('recorded_at', { ascending: false })
      .limit(3),
  ])

  const totalFollowers = (followersData as Array<{ value: number }> | null)?.reduce((sum, d) => sum + Number(d.value), 0) || 0
  const avgEngagement = (engagementData as Array<{ value: number }> | null)?.length
    ? (engagementData as Array<{ value: number }>).reduce((sum, d) => sum + Number(d.value), 0) / (engagementData as Array<{ value: number }>).length
    : 0

  const pendingTasks = (tasks as Array<{ status: string }> | null)?.filter(t => t.status === 'pending') || []
  const completedTasks = (tasks as Array<{ status: string }> | null)?.filter(t => t.status === 'done') || []

  return {
    accounts: (accounts as Array<unknown> | null) || [],
    tasks: (tasks as Array<unknown> | null) || [],
    posts: (posts as Array<unknown> | null) || [],
    totalFollowers,
    avgEngagement,
    pendingTasks,
    completedTasks,
    totalTasks: (tasks as Array<unknown> | null)?.length || 0,
  }
}
