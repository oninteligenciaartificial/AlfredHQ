'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}

export default function NewPaymentDialog({ workspaceId, onClose, onCreated }: Props) {
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [payerName, setPayerName] = useState('')
  const [method, setMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!concept.trim() || !amount) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/payments?workspace_id=${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: concept.trim(),
          amount: parseFloat(amount),
          payer_name: payerName.trim() || undefined,
          method: method || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Error al crear pago')
      }
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Nuevo pago</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Concepto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              required
              placeholder="Ej: Consulta dental, servicio contable..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Monto (BOB) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono outline-none focus:border-zinc-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Pagador</label>
            <input
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Nombre del pagador (opcional)"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Metodo de pago</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white"
            >
              <option value="">Sin especificar</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="qr">QR</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !concept.trim() || !amount}
              className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
