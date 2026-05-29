'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, MoreVertical, CheckCircle, XCircle, Search } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import type { Payment, PaymentStatus } from '@/lib/payments/repository'
import NewPaymentDialog from './new-payment-dialog'

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
}

const STATUS_CLASSES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  refunded: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
}

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PaymentsPage() {
  const { workspace } = useWorkspace()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [showNew, setShowNew] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ workspace_id: workspace.id })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/v1/payments?${params}`)
      if (!res.ok) throw new Error('Error al cargar pagos')
      const json = await res.json()
      setPayments(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [workspace?.id, statusFilter])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  async function handleConfirm(id: string) {
    if (!workspace?.id) return
    await fetch(`/api/v1/payments/${id}/confirm?workspace_id=${workspace.id}`, { method: 'POST' })
    setActionMenuId(null)
    fetchPayments()
  }

  async function handleCancel(id: string) {
    if (!workspace?.id) return
    await fetch(`/api/v1/payments/${id}?workspace_id=${workspace.id}`, { method: 'DELETE' })
    setActionMenuId(null)
    fetchPayments()
  }

  const filtered = payments.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.concept.toLowerCase().includes(q) ||
      (p.payer_name ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Pagos</h1>
          <p className="mt-1 text-sm text-zinc-500">{payments.length} registros</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo pago
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por concepto o pagador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
        >
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="confirmed">Confirmado</option>
          <option value="refunded">Reembolsado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-zinc-500">Cargando pagos...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <p className="text-zinc-500">
            {payments.length === 0
              ? 'No hay pagos aún. Registra tu primer pago.'
              : 'No hay pagos que coincidan con los filtros.'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Concepto</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Pagador</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Monto</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Metodo</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Fecha</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.concept}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.payer_name ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-zinc-900">
                    {formatAmount(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.method ? METHOD_LABELS[p.method] : '-'}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100"
                    >
                      <MoreVertical className="h-4 w-4 text-zinc-400" />
                    </button>
                    {actionMenuId === p.id && (
                      <div className="absolute right-4 top-10 z-20 w-40 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
                        {p.status === 'pending' && (
                          <button
                            onClick={() => handleConfirm(p.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Confirmar
                          </button>
                        )}
                        {(p.status === 'pending' || p.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancel(p.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewPaymentDialog
          workspaceId={workspace?.id ?? ''}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); fetchPayments() }}
        />
      )}
    </div>
  )
}
