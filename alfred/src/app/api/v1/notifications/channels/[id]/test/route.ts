import { createClient } from '@/lib/supabase/server'
import { getRateLimitHeaders } from '@/lib/security/rate-limit'
import { sendTelegramMessage } from '@/lib/notifications/telegram'
import { sendDiscordMessage } from '@/lib/notifications/discord'
import { NextResponse } from 'next/server'
import type { NotificationChannel } from '@/types/butler'

const TEST_MESSAGE = '🔔 Prueba de notificación desde Alfred. ¡Funciona!'

// 3 test calls per hour per user (in-memory, upgrade to Redis if needed)
const TEST_MAX = 3
const TEST_WINDOW = 60 * 60 * 1000
const testStore = new Map<string, { count: number; resetAt: number }>()

function checkTestLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = testStore.get(key)

  if (!entry || now > entry.resetAt) {
    testStore.set(key, { count: 1, resetAt: now + TEST_WINDOW })
    return { allowed: true, remaining: TEST_MAX - 1, resetAt: now + TEST_WINDOW }
  }

  if (entry.count >= TEST_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: TEST_MAX - entry.count, resetAt: entry.resetAt }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 3 test calls per hour per user
    const rateResult = checkTestLimit(`test:${user.id}`)
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 3 test notifications per hour.' },
        { status: 429, headers: getRateLimitHeaders(rateResult) }
      )
    }

    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    const workspace = ws as { id: string } | null
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    let channel: NotificationChannel | null = null
    try {
      const { data } = await (supabase
        .from('notification_channels') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspace.id)
        .single()
      channel = data as NotificationChannel | null
    } catch { /* fall through to null check */ }

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    let success = false

    if (channel.type === 'telegram') {
      success = await sendTelegramMessage(channel.target, TEST_MESSAGE, 'HTML')
    } else if (channel.type === 'discord') {
      success = await sendDiscordMessage(channel.target, TEST_MESSAGE)
    } else {
      return NextResponse.json({ error: 'Channel type not supported for testing' }, { status: 400 })
    }

    if (!success) {
      return NextResponse.json({ error: 'Failed to send test notification' }, { status: 502 })
    }

    return NextResponse.json(
      { data: { success: true } },
      { headers: getRateLimitHeaders(rateResult) }
    )
  } catch (err) {
    console.error('[channels/test POST] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
