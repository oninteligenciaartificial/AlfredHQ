'use client'

import { useState } from 'react'
import type { NotificationChannel } from '@/types/butler'

function channelIcon(type: string): string {
  switch (type) {
    case 'telegram':
      return '📱'
    case 'discord':
      return '🎮'
    case 'whatsapp':
      return '💬'
    default:
      return '🔔'
  }
}

function maskTarget(target: string): string {
  if (target.length <= 4) return '****'
  return '*'.repeat(target.length - 4) + target.slice(-4)
}

interface Props {
  channels: NotificationChannel[]
  workspaceId: string
  botUsername: string
}

export default function AlertsClient({ channels: initialChannels, workspaceId, botUsername }: Props) {
  const [channels, setChannels] = useState(initialChannels)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [discordLabel, setDiscordLabel] = useState('')
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [savingDiscord, setSavingDiscord] = useState(false)

  async function handleTest(channelId: string) {
    setTestingId(channelId)
    try {
      await fetch(`/api/v1/notifications/channels/${channelId}/test`, { method: 'POST' })
    } finally {
      setTestingId(null)
    }
  }

  async function handleDelete(channelId: string) {
    await fetch(`/api/v1/notifications/channels/${channelId}`, { method: 'DELETE' })
    setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, is_active: false } : ch))
  }

  async function handleAddDiscord(e: React.FormEvent) {
    e.preventDefault()
    if (!discordLabel || !discordWebhook) return
    setSavingDiscord(true)
    try {
      const res = await fetch('/api/v1/notifications/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'discord', target: discordWebhook, label: discordLabel }),
      })
      if (res.ok) {
        const { data } = await res.json()
        if (data) {
          setChannels(prev => [data, ...prev])
          setDiscordLabel('')
          setDiscordWebhook('')
        }
      }
    } finally {
      setSavingDiscord(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Connected channels */}
      <section>
        <h2 className="text-lg font-medium mb-4">Canales conectados</h2>

        {channels.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Conecta un canal para recibir alertas
          </div>
        ) : (
          <ul className="space-y-3">
            {channels.map(channel => (
              <li
                key={channel.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{channelIcon(channel.type)}</span>
                  <div>
                    <p className="font-medium">{channel.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {channel.type} · {maskTarget(channel.target)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      channel.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {channel.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => handleTest(channel.id)}
                    disabled={testingId === channel.id}
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {testingId === channel.id ? 'Enviando...' : 'Probar'}
                  </button>
                  <button
                    onClick={() => handleDelete(channel.id)}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Telegram connect */}
      <section className="rounded-lg border p-5 space-y-4">
        <h2 className="text-lg font-medium">📱 Conectar Telegram</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Abre Telegram en tu dispositivo</li>
          <li>
            Busca{' '}
            <span className="font-mono font-semibold">@{botUsername}</span>
          </li>
          <li>
            Envía el siguiente comando:
            <code className="ml-2 rounded bg-muted px-2 py-0.5 font-mono text-xs select-all">
              /start ws_{workspaceId}
            </code>
          </li>
          <li>Alfred guardará tu chat automáticamente</li>
        </ol>
      </section>

      {/* Discord connect */}
      <section className="rounded-lg border p-5 space-y-4">
        <h2 className="text-lg font-medium">🎮 Conectar Discord</h2>
        <p className="text-sm text-muted-foreground">
          Crea un Webhook en tu servidor de Discord y pégalo aquí.
        </p>
        <form onSubmit={handleAddDiscord} className="flex flex-col gap-3">
          <input
            value={discordLabel}
            onChange={e => setDiscordLabel(e.target.value)}
            placeholder="Nombre del canal (ej: #alertas)"
            required
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            value={discordWebhook}
            onChange={e => setDiscordWebhook(e.target.value)}
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            required
            className="rounded border px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={savingDiscord}
            className="self-start rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {savingDiscord ? 'Guardando...' : 'Guardar webhook'}
          </button>
        </form>
      </section>
    </div>
  )
}
