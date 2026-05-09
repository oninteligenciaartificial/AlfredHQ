import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get or create workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Buen día</h1>
        <p className="text-zinc-500">Aquí está el resumen de hoy</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Seguidores', value: '—', trend: '' },
          { label: 'Engagement', value: '—', trend: '' },
          { label: 'Posts esta semana', value: '—', trend: '' },
          { label: 'Tareas pendientes', value: '—', trend: '' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{metric.value}</p>
            {metric.trend && (
              <p className={`mt-1 text-sm ${metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {metric.trend}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Tareas de hoy</h2>
        <p className="text-sm text-zinc-500">
          Conecta tus redes sociales y define objetivos para que Alfred genere tareas automáticamente.
        </p>
      </div>
    </div>
  )
}
