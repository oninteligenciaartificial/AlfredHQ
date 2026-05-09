'use client'

import { useState } from 'react'
import type { Network } from '@/types'
import { TrendingUp, TrendingDown, Users, Heart, MessageCircle, Share2, Eye } from 'lucide-react'

type Period = 7 | 30 | 90

interface MetricCard {
  label: string
  value: string
  change: number
  icon: React.ReactNode
}

const MOCK_DATA: Record<Network, Record<Period, MetricCard[]>> = {
  instagram: {
    7: [
      { label: 'Seguidores', value: '2,840', change: 3.2, icon: <Users className="h-5 w-5" /> },
      { label: 'Likes', value: '1,240', change: 12.4, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '87', change: -4.1, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Alcance', value: '18,400', change: 8.7, icon: <Eye className="h-5 w-5" /> },
    ],
    30: [
      { label: 'Seguidores', value: '2,840', change: 9.8, icon: <Users className="h-5 w-5" /> },
      { label: 'Likes', value: '4,920', change: 22.1, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '341', change: 5.3, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Alcance', value: '72,000', change: 15.2, icon: <Eye className="h-5 w-5" /> },
    ],
    90: [
      { label: 'Seguidores', value: '2,840', change: 31.2, icon: <Users className="h-5 w-5" /> },
      { label: 'Likes', value: '14,200', change: 44.8, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '980', change: 18.4, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Alcance', value: '210,000', change: 52.1, icon: <Eye className="h-5 w-5" /> },
    ],
  },
  linkedin: {
    7: [
      { label: 'Seguidores', value: '1,120', change: 1.8, icon: <Users className="h-5 w-5" /> },
      { label: 'Reacciones', value: '340', change: 6.2, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '42', change: 14.2, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Compartidos', value: '18', change: -2.0, icon: <Share2 className="h-5 w-5" /> },
    ],
    30: [
      { label: 'Seguidores', value: '1,120', change: 7.4, icon: <Users className="h-5 w-5" /> },
      { label: 'Reacciones', value: '1,280', change: 18.9, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '164', change: 22.1, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Compartidos', value: '72', change: 8.4, icon: <Share2 className="h-5 w-5" /> },
    ],
    90: [
      { label: 'Seguidores', value: '1,120', change: 24.0, icon: <Users className="h-5 w-5" /> },
      { label: 'Reacciones', value: '3,840', change: 38.5, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '490', change: 41.2, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Compartidos', value: '210', change: 27.8, icon: <Share2 className="h-5 w-5" /> },
    ],
  },
  tiktok: {
    7: [
      { label: 'Seguidores', value: '5,420', change: 8.4, icon: <Users className="h-5 w-5" /> },
      { label: 'Likes', value: '12,400', change: 24.1, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '280', change: 11.3, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Vistas', value: '84,000', change: 31.7, icon: <Eye className="h-5 w-5" /> },
    ],
    30: [
      { label: 'Seguidores', value: '5,420', change: 28.2, icon: <Users className="h-5 w-5" /> },
      { label: 'Likes', value: '48,200', change: 62.4, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '1,120', change: 38.9, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Vistas', value: '320,000', change: 74.2, icon: <Eye className="h-5 w-5" /> },
    ],
    90: [
      { label: 'Seguidores', value: '5,420', change: 84.0, icon: <Users className="h-5 w-5" /> },
      { label: 'Likes', value: '142,000', change: 121.4, icon: <Heart className="h-5 w-5" /> },
      { label: 'Comentarios', value: '3,280', change: 88.7, icon: <MessageCircle className="h-5 w-5" /> },
      { label: 'Vistas', value: '920,000', change: 142.1, icon: <Eye className="h-5 w-5" /> },
    ],
  },
}

const NETWORK_LABELS: Record<Network, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
}

export default function AnalyticsPage() {
  const [network, setNetwork] = useState<Network>('instagram')
  const [period, setPeriod] = useState<Period>(7)

  const metrics = MOCK_DATA[network][period]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500">Métricas unificadas de tus redes</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
            <button
              key={n}
              onClick={() => setNetwork(n)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                network === n
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {NETWORK_LABELS[n]}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {([7, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-zinc-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{metric.icon}</span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metric.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(metric.change)}%
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-zinc-900">{metric.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Placeholder for charts */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
        <p className="text-sm font-medium text-zinc-600">Gráficas históricas</p>
        <p className="mt-1 text-xs text-zinc-400">
          Disponibles al conectar Supabase con datos reales de analytics
        </p>
      </div>

      {/* Top content placeholder */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-zinc-900">Contenido top del período</h3>
        <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center">
          <p className="text-sm text-zinc-400">
            Conecta tus redes para ver el contenido con mejor performance
          </p>
        </div>
      </div>
    </div>
  )
}
