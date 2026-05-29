import { createClient } from '@/lib/supabase/server'
import type { NotificationChannel } from '@/types/butler'
import AlertsClient from './alerts-client'

async function getAlertsData() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { workspaceId: null, channels: [] as NotificationChannel[] }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  const workspace = ws as { id: string } | null
  if (!workspace) return { workspaceId: null, channels: [] as NotificationChannel[] }

  let channels: NotificationChannel[] = []
  try {
    const { data } = await (supabase
      .from('notification_channels') as ReturnType<typeof supabase.from>)
      .select('id, type, label, target, is_active, created_at, workspace_id')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
    channels = (data as NotificationChannel[] | null) ?? []
  } catch { /* table may not exist yet */ }

  return { workspaceId: workspace.id, channels }
}

export default async function AlertsPage() {
  const { workspaceId, channels } = await getAlertsData()

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'AlfredButlerBot'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Alertas</h1>
        <p className="text-muted-foreground mt-1">
          Conecta canales para recibir notificaciones de pagos, impuestos y tareas.
        </p>
      </div>

      <AlertsClient
        channels={channels}
        workspaceId={workspaceId ?? ''}
        botUsername={botUsername}
      />
    </div>
  )
}
