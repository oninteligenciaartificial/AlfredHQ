import { anthropic, AGENT_MODEL } from '@/lib/claude/client'
import { agentTools } from '@/lib/claude/tools'
import { buildSystemPrompt } from '@/lib/claude/prompts'
import type { AgentMode } from '@/types'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export const runtime = 'edge'

export async function POST(request: Request) {
  const { message, history, agentMode, workspaceId } = await request.json() as {
    message: string
    history: MessageParam[]
    agentMode: AgentMode
    workspaceId?: string
  }

  if (!message?.trim()) {
    return Response.json({ error: 'Message required' }, { status: 400 })
  }

  const systemPrompt = buildSystemPrompt(
    'Mi Workspace',
    {
      connectedNetworks: [],
      goals: 'Sin objetivos definidos aún',
      analytics: 'Sin datos de analytics aún',
      pendingTasks: 'Sin tareas pendientes',
      recentPosts: 'Sin publicaciones recientes',
    },
    agentMode ?? 'advisory'
  )

  const messages: MessageParam[] = [
    ...(history ?? []).slice(-20),
    { role: 'user', content: message },
  ]

  const stream = await anthropic.messages.stream({
    model: AGENT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    tools: agentMode === 'execution' ? agentTools : [],
    messages,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
