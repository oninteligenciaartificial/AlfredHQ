import { createClient } from './server'

export async function buildAgentContext(workspaceId: string): Promise<{
  connectedNetworks: string[]
  goals: string
  analytics: string
  pendingTasks: string
  recentPosts: string
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const [accountsRes, goalsRes, tasksRes, analyticsRes, postsRes] =
    await Promise.all([
      supabase
        .from('social_accounts')
        .select('network')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true),
      supabase
        .from('workspace_goals')
        .select('network, metric, current_value, target_value, deadline')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true),
      supabase
        .from('daily_tasks')
        .select('type, title, priority')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending'),
      supabase
        .from('analytics_snapshots')
        .select('network, metric_name, value')
        .eq('workspace_id', workspaceId)
        .order('recorded_at', { ascending: false })
        .limit(20),
      supabase
        .from('content_posts')
        .select('networks, status, caption, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountsData: any[] = accountsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goalsData: any[] = goalsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasksData: any[] = tasksRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analyticsData: any[] = analyticsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postsData: any[] = postsRes.data ?? []

  const connectedNetworks = [
    ...new Set(accountsData.map((a) => a.network as string)),
  ]

  const goalsText =
    goalsData.length === 0
      ? 'Sin objetivos definidos'
      : goalsData
          .map((g) => {
            const network = g.network ? `${g.network}: ` : ''
            const current =
              g.current_value !== null ? `, actual: ${g.current_value}` : ''
            const deadline = g.deadline ? `, deadline: ${g.deadline}` : ''
            return `${network}${g.metric} → ${g.target_value}${current}${deadline}`
          })
          .join(' | ')

  const analyticsText = (() => {
    const rows = analyticsData
    if (rows.length === 0) return 'Sin datos de analytics aún'
    const byNetwork: Record<string, Record<string, number>> = {}
    for (const row of rows) {
      if (!byNetwork[row.network]) byNetwork[row.network] = {}
      if (!(row.metric_name in byNetwork[row.network])) {
        byNetwork[row.network][row.metric_name] = row.value as number
      }
    }
    return Object.entries(byNetwork)
      .map(([network, metrics]) => {
        const parts = Object.entries(metrics)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')
        return `${network}: ${parts}`
      })
      .join(' | ')
  })()

  const pendingTasksText =
    tasksData.length === 0
      ? 'Sin tareas pendientes'
      : tasksData
          .map(
            (t, i) =>
              `${i + 1}. ${t.type}: ${t.title}${t.priority ? ` (prioridad ${t.priority})` : ''}`,
          )
          .join('\n')

  const recentPostsText =
    postsData.length === 0
      ? 'Sin publicaciones recientes'
      : postsData
          .map((p, i) => {
            const networks = (p.networks as string[]).join(', ')
            const caption = p.caption
              ? `'${p.caption.slice(0, 60)}${p.caption.length > 60 ? '...' : ''}'`
              : '(sin caption)'
            const age = p.created_at
              ? (() => {
                  const diffMs =
                    Date.now() - new Date(p.created_at as string).getTime()
                  const diffDays = Math.floor(diffMs / 86400000)
                  return diffDays === 0
                    ? 'hoy'
                    : diffDays === 1
                      ? 'hace 1 día'
                      : `hace ${diffDays} días`
                })()
              : ''
            return `${i + 1}. [${networks}] ${p.status}: ${caption}${age ? ` (${age})` : ''}`
          })
          .join('\n')

  return {
    connectedNetworks,
    goals: goalsText,
    analytics: analyticsText,
    pendingTasks: pendingTasksText,
    recentPosts: recentPostsText,
  }
}
