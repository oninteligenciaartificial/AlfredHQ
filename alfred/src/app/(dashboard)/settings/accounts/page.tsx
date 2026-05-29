'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Network } from '@/types'
import { CheckCircle2, XCircle, ExternalLink, AlertCircle } from 'lucide-react'

interface SocialAccountUI {
  network: Network
  label: string
  description: string
  connected: boolean
  username: string | null
  disabled?: boolean
  disabledReason?: string
  color: string
}

const BASE_ACCOUNTS: SocialAccountUI[] = [
  {
    network: 'instagram',
    label: 'Instagram',
    description: 'Requiere cuenta Business o Creator vinculada a una Página de Facebook',
    connected: false,
    username: null,
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
  },
  {
    network: 'tiktok',
    label: 'TikTok',
    description: 'Requiere +1,000 seguidores para usar Content Posting API',
    connected: false,
    username: null,
    // TODO: TikTok OAuth requires app approval
    disabled: true,
    disabledReason: 'Próximamente — requiere aprobación de app TikTok',
    color: 'bg-zinc-900',
  },
  {
    network: 'linkedin',
    label: 'LinkedIn',
    description: 'Publica como Company Page. Requiere permisos de admin.',
    connected: false,
    username: null,
    color: 'bg-blue-600',
  },
]

function NetworkLogo({ network, className }: { network: Network; className?: string }) {
  const base = `flex items-center justify-center rounded-xl text-white font-bold ${className}`
  if (network === 'instagram') {
    return (
      <div className={`${base} bg-gradient-to-br from-purple-500 to-pink-500`}>
        <span className="text-lg">IG</span>
      </div>
    )
  }
  if (network === 'tiktok') {
    return (
      <div className={`${base} bg-zinc-900`}>
        <span className="text-lg">TT</span>
      </div>
    )
  }
  return (
    <div className={`${base} bg-blue-600`}>
      <span className="text-lg">in</span>
    </div>
  )
}

export default function SettingsAccountsPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccountUI[]>(BASE_ACCOUNTS)
  const [connecting, setConnecting] = useState<Network | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadConnectedAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/social/accounts')
      if (!res.ok) return
      const data: Array<{ network: string; username: string | null }> = await res.json()

      setAccounts((prev) =>
        prev.map((account) => {
          const found = data.find((d) => d.network === account.network)
          if (found) {
            return { ...account, connected: true, username: found.username }
          }
          return account
        })
      )
    } catch {
      setLoadError('No se pudieron cargar las cuentas conectadas')
    }
  }, [])

  useEffect(() => {
    void loadConnectedAccounts()
  }, [loadConnectedAccounts])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      setNotification({
        type: 'success',
        message: `${connected.charAt(0).toUpperCase() + connected.slice(1)} conectado correctamente`,
      })
      setTimeout(() => setNotification(null), 5000)
    } else if (error) {
      const network = error.replace('_failed', '')
      setNotification({
        type: 'error',
        message: `Error al conectar ${network}. Verifica las credenciales e intenta nuevamente.`,
      })
      setTimeout(() => setNotification(null), 7000)
    }
  }, [searchParams])

  function handleConnect(network: Network) {
    if (network === 'tiktok') return
    setConnecting(network)
    window.location.href = `/api/social/auth/${network}`
  }

  async function handleDisconnect(network: Network) {
    try {
      const res = await fetch(`/api/social/disconnect/${network}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      setAccounts((prev) =>
        prev.map((a) =>
          a.network === network ? { ...a, connected: false, username: null } : a
        )
      )
    } catch {
      setNotification({ type: 'error', message: `Error al desconectar ${network}` })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Cuentas sociales</h1>
        <p className="text-zinc-500">Conecta tus redes para que Alfred pueda gestionarlas</p>
      </div>

      {notification && (
        <div
          className={`rounded-xl border p-4 flex gap-3 ${
            notification.type === 'success'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
          )}
          <p
            className={`text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {notification.message}
          </p>
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-800">{loadError}</p>
        </div>
      )}

      <div className="space-y-4">
        {accounts.map((account) => (
          <div
            key={account.network}
            className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5"
          >
            <NetworkLogo network={account.network} className="h-12 w-12 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-zinc-900">{account.label}</p>
                {account.disabled ? (
                  <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-400">
                    No disponible
                  </span>
                ) : account.connected ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                    <XCircle className="h-3 w-3" />
                    Desconectado
                  </span>
                )}
              </div>
              {account.disabled ? (
                <p className="mt-0.5 text-xs text-zinc-400">{account.disabledReason}</p>
              ) : account.connected && account.username ? (
                <p className="mt-0.5 text-sm text-zinc-500">{account.username}</p>
              ) : (
                <p className="mt-0.5 text-xs text-zinc-400">{account.description}</p>
              )}
            </div>

            <div className="flex-shrink-0">
              {account.disabled ? (
                <button
                  disabled
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400 cursor-not-allowed"
                >
                  Próximamente
                </button>
              ) : account.connected ? (
                <button
                  onClick={() => handleDisconnect(account.network)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(account.network)}
                  disabled={connecting === account.network}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {connecting === account.network ? (
                    'Redirigiendo...'
                  ) : (
                    <>
                      <ExternalLink className="h-3 w-3" />
                      Conectar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs text-zinc-500 font-medium mb-2">Permisos requeridos por red</p>
        <ul className="space-y-1 text-xs text-zinc-400">
          <li><span className="font-medium text-zinc-600">Instagram:</span> instagram_basic, instagram_content_publish, instagram_manage_comments</li>
          <li><span className="font-medium text-zinc-600">TikTok:</span> video.publish, video.upload, comment.list.manage (requiere aprobación)</li>
          <li><span className="font-medium text-zinc-600">LinkedIn:</span> w_member_social, r_organization_social, rw_organization_admin</li>
        </ul>
      </div>
    </div>
  )
}
