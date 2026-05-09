'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

export default function SettingsWorkspacePage() {
  const [name, setName] = useState('Mi Workspace')
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    // Will save to Supabase workspaces table when connected
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Workspace</h1>
        <p className="text-zinc-500">Configuración general de tu workspace</p>
      </div>

      <form onSubmit={handleSave} className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
            Nombre del workspace
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="Ej: OnIA Social"
            maxLength={60}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Plan</label>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
              Internal
            </span>
            <span className="text-sm text-zinc-500">Uso interno OnIA — sin límites</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Guardado
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
        <h3 className="font-semibold text-zinc-900">Zona de peligro</h3>
        <p className="text-sm text-zinc-500">
          Eliminar el workspace borrará todas las cuentas conectadas, objetivos, tareas y conversaciones.
        </p>
        <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
          Eliminar workspace
        </button>
      </div>
    </div>
  )
}
