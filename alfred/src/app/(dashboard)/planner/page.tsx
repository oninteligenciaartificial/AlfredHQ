'use client'

import { useState } from 'react'
import type { Network, PostStatus } from '@/types'
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle2, XCircle, FileEdit } from 'lucide-react'

interface PostUI {
  id: string
  caption: string
  networks: Network[]
  scheduled_at: string | null
  status: PostStatus
}

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', color: 'bg-zinc-100 text-zinc-600', icon: <FileEdit className="h-3 w-3" /> },
  scheduled: { label: 'Programado', color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
}

const MOCK_POSTS: PostUI[] = [
  {
    id: '1',
    caption: 'Así transformamos el negocio de nuestro cliente en 30 días 🚀',
    networks: ['instagram', 'linkedin'],
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
  },
  {
    id: '2',
    caption: '5 errores que cometen las marcas en redes sociales (y cómo evitarlos)',
    networks: ['instagram'],
    scheduled_at: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
  },
  {
    id: '3',
    caption: 'Behind the scenes: nuestro proceso de creación de contenido',
    networks: ['tiktok', 'instagram'],
    scheduled_at: null,
    status: 'draft',
  },
]

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  return days
}

function postsByDay(posts: PostUI[], year: number, month: number, day: number) {
  return posts.filter((p) => {
    if (!p.scheduled_at) return false
    const d = new Date(p.scheduled_at)
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })
}

export default function PlannerPage() {
  const today = new Date()
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedPost, setSelectedPost] = useState<PostUI | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [newNetworks, setNewNetworks] = useState<Network[]>(['instagram'])
  const [posts, setPosts] = useState<PostUI[]>(MOCK_POSTS)

  const days = buildCalendarDays(viewDate.year, viewDate.month)

  function prevMonth() {
    setViewDate((prev) => {
      const m = prev.month - 1
      return m < 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: m }
    })
  }

  function nextMonth() {
    setViewDate((prev) => {
      const m = prev.month + 1
      return m > 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: m }
    })
  }

  function toggleNetwork(n: Network) {
    setNewNetworks((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    )
  }

  function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault()
    if (!newCaption.trim() || newNetworks.length === 0) return
    const draft: PostUI = {
      id: Date.now().toString(),
      caption: newCaption,
      networks: newNetworks,
      scheduled_at: null,
      status: 'draft',
    }
    setPosts((prev) => [draft, ...prev])
    setNewCaption('')
    setNewNetworks(['instagram'])
    setShowNewPost(false)
  }

  const drafts = posts.filter((p) => p.status === 'draft')
  const scheduled = posts.filter((p) => p.status === 'scheduled')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Planner</h1>
          <p className="text-zinc-500">Calendario de contenido</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Nuevo post
        </button>
      </div>

      {/* New post form */}
      {showNewPost && (
        <form
          onSubmit={handleCreateDraft}
          className="rounded-xl border border-zinc-300 bg-white p-5 space-y-4"
        >
          <h3 className="font-semibold text-zinc-900">Nuevo borrador</h3>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Caption</label>
            <textarea
              required
              rows={3}
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Escribe el texto de tu publicación..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-2">Redes destino</label>
            <div className="flex gap-2">
              {(['instagram', 'tiktok', 'linkedin'] as Network[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNetwork(n)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                    newNetworks.includes(n)
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowNewPost(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Crear borrador
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-900">
              {MONTHS[viewDate.month]} {viewDate.year}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-zinc-400">
                {d}
              </div>
            ))}
            {days.map((day, i) => {
              const dayPosts = day
                ? postsByDay(posts, viewDate.year, viewDate.month, day)
                : []
              const isToday =
                day === today.getDate() &&
                viewDate.month === today.getMonth() &&
                viewDate.year === today.getFullYear()

              return (
                <div
                  key={i}
                  className={`min-h-[60px] rounded-lg p-1 ${
                    day ? 'hover:bg-zinc-50 cursor-pointer' : ''
                  } ${isToday ? 'bg-zinc-100' : ''}`}
                >
                  {day && (
                    <>
                      <p
                        className={`text-xs font-medium mb-1 ${
                          isToday ? 'text-zinc-900' : 'text-zinc-500'
                        }`}
                      >
                        {day}
                      </p>
                      {dayPosts.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPost(p)}
                          className="mb-0.5 truncate rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700 cursor-pointer hover:bg-blue-200"
                        >
                          {p.networks[0]}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <p className="text-xs text-zinc-400">+{dayPosts.length - 2}</p>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar: drafts + scheduled */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">
              Programados ({scheduled.length})
            </h3>
            <div className="space-y-2">
              {scheduled.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPost(p)}
                  className="cursor-pointer rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50"
                >
                  <p className="text-xs font-medium text-zinc-900 truncate">{p.caption}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {p.scheduled_at
                      ? new Date(p.scheduled_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </div>
                </div>
              ))}
              {scheduled.length === 0 && (
                <p className="text-xs text-zinc-400">Sin posts programados</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">
              Borradores ({drafts.length})
            </h3>
            <div className="space-y-2">
              {drafts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPost(p)}
                  className="cursor-pointer rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50"
                >
                  <p className="text-xs font-medium text-zinc-900 truncate">{p.caption}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {p.networks.join(', ')}
                  </p>
                </div>
              ))}
              {drafts.length === 0 && (
                <p className="text-xs text-zinc-400">Sin borradores</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_CONFIG[selectedPost.status].color}`}>
                {STATUS_CONFIG[selectedPost.status].icon}
                {STATUS_CONFIG[selectedPost.status].label}
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-zinc-400 hover:text-zinc-900 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-zinc-800 whitespace-pre-wrap">{selectedPost.caption}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedPost.networks.map((n) => (
                <span
                  key={n}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 capitalize"
                >
                  {n}
                </span>
              ))}
            </div>

            {selectedPost.scheduled_at && (
              <p className="mt-3 text-xs text-zinc-400">
                Programado:{' '}
                {new Date(selectedPost.scheduled_at).toLocaleString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Editar
              </button>
              {selectedPost.status === 'draft' && (
                <button className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                  Programar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
