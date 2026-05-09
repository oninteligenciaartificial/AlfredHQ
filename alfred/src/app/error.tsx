'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service (Sentry, etc.)
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-zinc-900">Algo salió mal</h1>
            <p className="mt-4 text-zinc-500">
              Ha ocurrido un error inesperado. Por favor intenta de nuevo.
            </p>
            <button
              onClick={reset}
              className="mt-6 rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
