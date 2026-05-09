import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle, Zap } from 'lucide-react'

const MOCK_METRICS = [
  { label: 'Seguidores totales', value: '9,380', trend: '+4.2%', up: true },
  { label: 'Engagement rate', value: '3.8%', trend: '+0.6%', up: true },
  { label: 'Posts esta semana', value: '3', trend: '', up: true },
  { label: 'Tareas pendientes', value: '3', trend: '', up: false },
]

const MOCK_TASKS = [
  { id: '1', type: 'PUBLICAR', title: 'Publicar post sobre tu servicio estrella', network: 'instagram', priority: 5, status: 'pending' },
  { id: '2', type: 'CRECER', title: 'Interactuar con 10 cuentas de tu nicho', network: 'instagram', priority: 4, status: 'pending' },
  { id: '3', type: 'ANALIZAR', title: 'Revisar métricas de la semana', network: null, priority: 3, status: 'pending' },
]

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 capitalize">Buen día</h1>
        <p className="text-zinc-500 capitalize">{today}</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {MOCK_METRICS.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{metric.value}</p>
            {metric.trend && (
              <p className={`mt-1 text-sm font-medium ${metric.up ? 'text-green-600' : 'text-zinc-500'}`}>
                {metric.trend}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks today */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-900">Tareas de hoy</h2>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {MOCK_TASKS.map((task) => (
              <div key={task.id} className="flex items-center gap-3">
                <Circle className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{task.title}</p>
                  <p className="text-xs text-zinc-400">{task.type} · {task.network ?? 'todas las redes'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick agent */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-900">Alfred dice</h2>
            <Link
              href="/agent"
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
            >
              Abrir chat <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-sm text-zinc-600">
              Hoy es un buen día para publicar contenido — es jueves, el engagement
              en Instagram suele ser 20% mayor en la tarde. Tienes 3 tareas pendientes
              y 0 publicaciones programadas para hoy.
            </p>
          </div>
          <Link
            href="/agent"
            className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 w-full justify-center"
          >
            <Zap className="h-4 w-4" />
            Preguntarle a Alfred
          </Link>
        </div>
      </div>

      {/* Setup banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-amber-400 flex items-center justify-center">
          <span className="text-xs text-white font-bold">!</span>
        </div>
        <div>
          <p className="text-sm font-medium text-amber-900">Conecta tus redes sociales</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Los datos actuales son de ejemplo. Ve a{' '}
            <Link href="/settings/accounts" className="underline">
              Settings → Cuentas
            </Link>{' '}
            para conectar Instagram, TikTok y LinkedIn.
          </p>
        </div>
      </div>
    </div>
  )
}
