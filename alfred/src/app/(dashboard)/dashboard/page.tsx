import Link from 'next/link'
import { ArrowRight, Circle, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateWorkspace } from '@/lib/supabase/workspace'
import { getDashboardMetrics, getTodayTasks } from '@/lib/supabase/queries'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const workspace = await getOrCreateWorkspace(user.id)
  const [metrics, tasks] = await Promise.all([
    getDashboardMetrics(workspace.id),
    getTodayTasks(workspace.id),
  ])

  const topTasks = tasks.filter((t) => t.status === 'pending').slice(0, 3)

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const metricsDisplay = [
    {
      label: 'Seguidores totales',
      value: metrics.totalFollowers.toLocaleString('es-ES'),
      trend: '',
      up: true,
    },
    {
      label: 'Engagement rate',
      value: `${metrics.engagementRate.toFixed(1)}%`,
      trend: '',
      up: true,
    },
    {
      label: 'Posts esta semana',
      value: String(metrics.postsThisWeek),
      trend: '',
      up: true,
    },
    {
      label: 'Tareas pendientes',
      value: String(metrics.pendingTasksCount),
      trend: '',
      up: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 capitalize">Buen día</h1>
        <p className="text-zinc-500 capitalize">{today}</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsDisplay.map((metric) => (
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
            {topTasks.length === 0 ? (
              <p className="text-sm text-zinc-400">Sin tareas pendientes</p>
            ) : (
              topTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <Circle className="h-4 w-4 flex-shrink-0 text-zinc-300" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{task.title}</p>
                    <p className="text-xs text-zinc-400">{task.type} · {task.network ?? 'todas las redes'}</p>
                  </div>
                </div>
              ))
            )}
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
              Tienes {metrics.pendingTasksCount} tarea{metrics.pendingTasksCount !== 1 ? 's' : ''} pendiente{metrics.pendingTasksCount !== 1 ? 's' : ''} hoy
              y {metrics.postsThisWeek} publicacion{metrics.postsThisWeek !== 1 ? 'es' : ''} esta semana.
              {metrics.totalFollowers > 0
                ? ` Alcanzaste ${metrics.totalFollowers.toLocaleString('es-ES')} seguidores totales.`
                : ' Conecta tus redes para ver métricas reales.'}
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
            Ve a{' '}
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
