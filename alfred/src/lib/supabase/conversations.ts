import { createClient } from './server'

export interface MessageParam {
  role: 'user' | 'assistant'
  content: string
}

export async function getRecentConversations(
  workspaceId: string,
  limit = 20,
): Promise<MessageParam[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data } = await supabase
    .from('agent_conversations')
    .select('role, content')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!data || data.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[])
    .reverse()
    .map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content as string,
    }))
}

export async function saveMessage(
  workspaceId: string,
  role: 'user' | 'assistant',
  content: string,
  agentMode: string,
  toolCalls?: unknown,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase.from('agent_conversations').insert({
    workspace_id: workspaceId,
    role,
    content,
    agent_mode: agentMode,
    tool_calls: toolCalls ?? null,
  })
}
