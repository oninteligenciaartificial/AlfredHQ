'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Check, AlertTriangle, Clock, FileText, Building2 } from 'lucide-react'

export interface TaxObligation {
  id: string
  business_id: string
  tax_type: string
  period: string
  due_date: string
  status: 'upcoming' | 'due_soon' | 'overdue' | 'filed'
  filed_at: string | null
  filed_amount: number | null
  notes: string | null
}

export interface Business {
  id: string
  name: string
  nit: string | null
  tax_regime: string | null
}

const STATUS_STYLES: Record<string, { badge: string; label: string; icon: React.ReactNode }> = {
  upcoming: { badge: 'bg-zinc-100 text-zinc-600', label: 'Pendiente', icon: <Clock className="h-3 w-3" /> },
  due_soon: { badge: 'bg-amber-100 text-amber-700', label: 'Próximo', icon: <AlertTriangle className="h-3 w-3" /> },
  overdue:  { badge: 'bg-red-100 text-red-700',    label: 'Vencido',  icon: <AlertTriangle className="h-3 w-3" /> },
  filed:    { badge: 'bg-green-100 text-green-700', label: 'Presentado', icon: <Check className="h-3 w-3" /> },
}

const TAX_COLORS: Record<string, string> = {
  IVA:    'bg-blue-100 text-blue-700',
  IT:     'bg-purple-100 text-purple-700',
  IUE:    'bg-orange-100 text-orange-700',
  RC_IVA: 'bg-teal-100 text-teal-700',
  IEHD:   'bg-pink-100 text-pink-700',
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Props {
  year: number
  obligations: TaxObligation[]
  businesses: Business[]
  workspaceId: string
}

export function CalendarClient({ year, obligations, businesses, workspaceId }: Props) {
  const router = useRouter()
  const [filing, setFiling] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date()

  const businessMap = Object.fromEntries(businesses.map((b) => [b.id, b]))

  const grouped: Record<number, TaxObligation[]> = {}
  for (const ob of obligations) {
    const m = parseISO(ob.due_date).getMonth()
    if (!grouped[m]) grouped[m] = []
    grouped[m].push(ob)
  }

  const thisMonthObs = grouped[today.getMonth()] ?? []
  const filedCount = obligations.filter((o) => o.status === 'filed').length
  const nextOb = obligations.find((o) => o.status !== 'filed' && parseISO(o.due_date) >= today)
  const daysToNext = nextOb ? differenceInDays(parseISO(nextOb.due_date), today) : null

  function changeYear(delta: number) {
    startTransition(() => {
      router.push(`/calendar?year=${year + delta}`)
    })
  }

  async function markFiled(id: string) {
    setFiling(id)
    try {
      await fetch(`/api/v1/tax/obligations/${id}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      router.refresh()
    } finally {
      setFiling(null)
    }
  }

  const hasBusinessWithNit = businesses.some((b) => b.nit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Calendario Tributario {year}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Bolivia — SIN</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeYear(-1)}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-100 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4rem] text-center text-sm font-semibold text-zinc-900">{year}</span>
          <button
            onClick={() => changeYear(1)}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-100 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {obligations.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-4">
          <div className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{thisMonthObs.length}</span> vencimientos este mes
          </div>
          <div className="text-sm text-zinc-600">
            <span className="font-semibold text-green-700">{filedCount}</span> pagados
          </div>
          {daysToNext !== null && (
            <div className="text-sm text-zinc-600">
              próximo en <span className={`font-semibold ${daysToNext <= 14 ? 'text-amber-700' : 'text-zinc-900'}`}>
                {daysToNext} días
              </span>
            </div>
          )}
        </div>
      )}

      {/* No NIT state */}
      {!hasBusinessWithNit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h3 className="font-semibold text-amber-900">Configura el NIT de tu empresa</h3>
          <p className="mt-1 text-sm text-amber-700">
            Para generar tu calendario tributario, agrega el NIT en la configuración de tu empresa.
          </p>
          <a
            href="/settings/accounts"
            className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Ir a Configuración
          </a>
        </div>
      )}

      {/* Empty obligations with NIT configured */}
      {hasBusinessWithNit && obligations.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <h3 className="font-semibold text-zinc-700">Sin obligaciones para {year}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Genera las obligaciones tributarias usando la API o el agente Alfred.
          </p>
        </div>
      )}

      {/* Month groups */}
      {MONTHS.map((monthName, monthIdx) => {
        const obs = grouped[monthIdx]
        if (!obs || obs.length === 0) return null

        return (
          <div key={monthIdx} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              {monthName}
            </h2>
            <div className="space-y-2">
              {obs.map((ob) => {
                const style = STATUS_STYLES[ob.status] ?? STATUS_STYLES.upcoming
                const taxColor = TAX_COLORS[ob.tax_type] ?? 'bg-zinc-100 text-zinc-600'
                const biz = businessMap[ob.business_id]
                const dueDate = parseISO(ob.due_date)

                return (
                  <div
                    key={ob.id}
                    className={`flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 ${
                      ob.status === 'filed' ? 'opacity-60' : ''
                    }`}
                  >
                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${taxColor}`}>
                      {ob.tax_type}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900">
                          Período {ob.period}
                        </p>
                        {biz && (
                          <span className="text-xs text-zinc-400">{biz.name}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Vence el {format(dueDate, "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>

                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}>
                      {style.icon}
                      {style.label}
                    </span>

                    {ob.status !== 'filed' && (
                      <button
                        onClick={() => markFiled(ob.id)}
                        disabled={filing === ob.id}
                        className="shrink-0 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        {filing === ob.id ? '...' : 'Marcar como presentado'}
                      </button>
                    )}

                    {ob.status === 'filed' && ob.filed_at && (
                      <span className="shrink-0 text-xs text-green-600">
                        {format(parseISO(ob.filed_at), 'd MMM', { locale: es })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
