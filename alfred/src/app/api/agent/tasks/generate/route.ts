import { openai, AGENT_MODEL } from '@/lib/claude/client'
import { createClient } from '@/lib/supabase/server'

interface GeneratedTask {
  type: 'PUBLICAR' | 'RESPONDER' | 'ANALIZAR' | 'OPTIMIZAR' | 'CRECER'
  title: string
  description: string | null
  network: 'instagram' | 'tiktok' | 'linkedin' | null
  priority: number | null
  goal_id: string | null
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const expectedToken = process.env.N8N_WEBHOOK_SECRET

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let workspaceId: string
  try {
    const body = await request.json() as { workspaceId?: string }
    if (!body.workspaceId) {
      return Response.json({ error: 'workspaceId required' }, { status: 400 })
    }
    workspaceId = body.workspaceId
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = await createClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [analyticsRes, goalsRes, postsRes] = await Promise.all([
    supabase
      .from('analytics_snapshots')
      .select('network, metric_name, value, recorded_at')
      .eq('workspace_id', workspaceId)
      .gte('recorded_at', sevenDaysAgo)
      .order('recorded_at', { ascending: false }),
    supabase
      .from('workspace_goals')
      .select('id, network, metric, current_value, target_value, deadline')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true),
    supabase
      .from('content_posts')
      .select('networks, published_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const recentMetrics = analyticsRes.data ?? []
  const activeGoals = goalsRes.data ?? []
  const recentPosts = (postsRes.data ?? []) as { networks: string[]; published_at: string | null; created_at: string }[]

  // Calculate days since last post per network
  const networks = ['instagram', 'tiktok', 'linkedin'] as const
  const daysSincePost: Record<string, number> = {}

  for (const network of networks) {
    const lastPost = recentPosts.find((p) =>
      (p.networks as string[]).includes(network),
    )
    if (!lastPost) {
      daysSincePost[network] = 999
    } else {
      const date = lastPost.published_at ?? lastPost.created_at
      const diffMs = Date.now() - new Date(date as string).getTime()
      daysSincePost[network] = Math.floor(diffMs / 86400000)
    }
  }

  const igDays = daysSincePost['instagram'] ?? 999
  const ttDays = daysSincePost['tiktok'] ?? 999
  const liDays = daysSincePost['linkedin'] ?? 999

  const taskPrompt = `Analiza los siguientes datos del workspace y genera entre 3 y 7 tareas para hoy.
Responde SOLO con un array JSON.

MÉTRICAS RECIENTES: ${JSON.stringify(recentMetrics)}
OBJETIVOS ACTIVOS: ${JSON.stringify(activeGoals)}
ÚLTIMAS PUBLICACIONES: ${JSON.stringify(recentPosts)}
DÍAS SIN PUBLICAR: Instagram: ${igDays}d | TikTok: ${ttDays}d | LinkedIn: ${liDays}d

Cada tarea debe tener:
- type: PUBLICAR | RESPONDER | ANALIZAR | OPTIMIZAR | CRECER
- title: máximo 60 caracteres, accionable
- description: qué hacer exactamente y por qué (máximo 150 caracteres)
- network: instagram | tiktok | linkedin | null (todas)
- priority: 1 (baja) a 5 (crítica)
- goal_id: UUID del objetivo relacionado o null

Prioriza las tareas que más impactan en los objetivos definidos.`

  let generatedTasks: GeneratedTask[] = []

  try {
    const response = await openai.chat.completions.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: taskPrompt }],
    })

    const text = response.choices[0]?.message?.content ?? ''

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      generatedTasks = JSON.parse(jsonMatch[0]) as GeneratedTask[]
    }
  } catch {
    generatedTasks = []
  }

  if (generatedTasks.length === 0) {
    return Response.json({ generated: 0, tasks: [] })
  }

  const today = new Date().toISOString().split('T')[0]

  const rows = generatedTasks.map((t) => ({
    workspace_id: workspaceId,
    date: today,
    type: t.type,
    title: t.title,
    description: t.description ?? null,
    network: t.network ?? null,
    priority: t.priority ?? null,
    status: 'pending' as const,
    agent_generated: true,
    goal_id: t.goal_id ?? null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await supabase
    .from('daily_tasks')
    .insert(rows as any)
    .select()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ generated: inserted?.length ?? 0, tasks: inserted })
}
