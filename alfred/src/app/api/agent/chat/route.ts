import { openai, AGENT_MODEL } from '@/lib/claude/client'
import { agentTools } from '@/lib/claude/tools'
import { buildSystemPrompt } from '@/lib/claude/prompts'
import { buildAgentContext } from '@/lib/supabase/agent-context'
import { getRecentConversations, saveMessage, type MessageParam } from '@/lib/supabase/conversations'
import type { AgentMode } from '@/types'

export const runtime = 'edge'

const PLACEHOLDER_CONTEXT = {
  connectedNetworks: [] as string[],
  goals: 'Sin objetivos definidos aún',
  analytics: 'Sin datos de analytics aún',
  pendingTasks: 'Sin tareas pendientes',
  recentPosts: 'Sin publicaciones recientes',
}

export async function POST(request: Request) {
  const { message, agentMode, workspaceId } = await request.json() as {
    message: string
    agentMode: AgentMode
    workspaceId?: string
  }

  if (!message?.trim()) {
    return Response.json({ error: 'Message required' }, { status: 400 })
  }

  let context = PLACEHOLDER_CONTEXT
  let history: MessageParam[] = []

  if (workspaceId) {
    try {
      ;[context, history] = await Promise.all([
        buildAgentContext(workspaceId),
        getRecentConversations(workspaceId),
      ])
    } catch {
      // Fall back to placeholder context on error
    }
  }

  const systemPrompt = buildSystemPrompt(
    'Mi Workspace',
    context,
    agentMode ?? 'advisory',
  )

  const messages: MessageParam[] = [
    ...history.slice(-20),
    { role: 'user', content: message },
  ]

  const stream = await openai.chat.completions.create({
    model: AGENT_MODEL,
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  const encoder = new TextEncoder()
  let fullResponse = ''

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          fullResponse += delta
          controller.enqueue(encoder.encode(delta))
        }
      }
      controller.close()

      if (workspaceId) {
        try {
          await Promise.all([
            saveMessage(workspaceId, 'user', message, agentMode ?? 'advisory'),
            saveMessage(workspaceId, 'assistant', fullResponse, agentMode ?? 'advisory'),
          ])
        } catch {
          // Non-fatal: persistence failure should not affect the user
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
