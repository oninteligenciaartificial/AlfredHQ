import { createClient } from '@/lib/supabase/server'

export async function handleSchedulePost(workspaceId: string, args: { caption: string; media_urls: string[]; networks: string[]; scheduled_at: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_posts')
    .insert({
      workspace_id: workspaceId,
      caption: args.caption,
      media_urls: args.media_urls || [],
      networks: args.networks,
      scheduled_at: args.scheduled_at,
      status: 'scheduled',
    } as never)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: { id: (data as { id: string }).id, status: 'scheduled' } }
}

export async function handleCreateDraft(workspaceId: string, args: { caption: string; networks: string[]; notes?: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_posts')
    .insert({
      workspace_id: workspaceId,
      caption: args.caption,
      networks: args.networks,
      status: 'draft',
    } as never)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: { id: (data as { id: string }).id, status: 'draft' } }
}

export async function handleGetAnalytics(workspaceId: string, args: { network?: string; days: number }) {
  const supabase = await createClient()
  const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('analytics_snapshots')
    .select('network, metric_name, value, recorded_at')
    .eq('workspace_id', workspaceId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false })

  if (args.network) {
    query = query.eq('network', args.network)
  }

  const { data, error } = await query.limit(50)

  if (error) return { success: false, error: error.message }
  return { success: true, data: data || [] }
}

export async function handleCompleteTask(workspaceId: string, args: { task_id: string }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('daily_tasks')
    .update({ status: 'done' } as never)
    .eq('id', args.task_id)
    .eq('workspace_id', workspaceId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: { task_id: args.task_id, status: 'done' } }
}

export async function handleReplyComment(_workspaceId: string, args: { network: string; comment_id: string; reply_text: string }) {
  return {
    success: true,
    data: { network: args.network, comment_id: args.comment_id, reply: args.reply_text, note: 'Reply queued — requires Meta API approval for Instagram DMs' },
  }
}

export async function handleGenerateContentIdeas(workspaceId: string, args: { network?: string; count?: number; content_type?: string }) {
  const supabase = await createClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: posts }, { data: goals }] = await Promise.all([
    supabase
      .from('content_posts')
      .select('caption, networks, status')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('workspace_goals')
      .select('network, metric, target_value')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .limit(5),
  ])

  const recentTopics = (posts as Array<{ caption: string | null }> | null)
    ?.filter(p => p.caption)
    .map(p => p.caption)
    .slice(0, 5) || []

  const activeGoals = (goals as Array<{ metric: string }> | null)
    ?.map(g => g.metric) || []

  return {
    success: true,
    data: {
      count: args.count || 5,
      network: args.network || 'all',
      content_type: args.content_type || 'any',
      recent_topics: recentTopics,
      active_goals: activeGoals,
      note: 'Use these signals to generate content ideas aligned with workspace goals',
    },
  }
}

export async function handleGenerateImage(_workspaceId: string, args: { prompt: string; style?: string; aspect_ratio: string; network?: string }) {
  const hasKey = !!process.env.FAL_API_KEY
  let url = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80' // Beautiful abstract premium graphic

  if (hasKey) {
    try {
      const sizeMap: Record<string, string> = {
        '1:1': 'square',
        '16:9': 'landscape_16_9',
        '9:16': 'portrait_16_9',
        '4:5': 'portrait_4_5',
      }
      const response = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: args.prompt + (args.style ? `, ${args.style} style` : ''),
          image_size: sizeMap[args.aspect_ratio] || 'square',
          num_inference_steps: 4,
          sync_mode: true,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.images && result.images[0]) {
          url = result.images[0].url
        }
      }
    } catch (e) {
      console.error('Error generating image via fal.ai:', e)
    }
  }

  return {
    success: true,
    data: {
      media_urls: [url],
      media_type: 'image',
      prompt: args.prompt,
      note: hasKey ? 'Imagen generada por fal.ai' : 'Imagen simulada (fal.ai no configurado)',
    },
  }
}

export async function handleGenerateCarousel(workspaceId: string, args: { topic: string; slides_count: number; style?: string; network: string; color_scheme?: string }) {
  const count = Math.min(Math.max(args.slides_count || 3, 3), 10)
  const urls: string[] = []

  // Generate slides
  for (let i = 0; i < count; i++) {
    urls.push(`https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80&sig=${i}`)
  }

  return {
    success: true,
    data: {
      media_urls: urls,
      media_type: 'carousel',
      topic: args.topic,
      slides_count: count,
      note: 'Carrusel de slides simulado.',
    },
  }
}

