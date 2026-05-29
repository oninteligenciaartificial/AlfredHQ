'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { format, parseISO, isToday, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Plus, StickyNote, ClipboardList, Pin } from 'lucide-react'

export interface Todo {
  id: string
  title: string
  notes: string | null
  due_date: string | null
  priority: number
  status: 'open' | 'done' | 'cancelled'
  source: string
  created_at: string
}

export interface Note {
  id: string
  title: string | null
  body: string | null
  pinned: boolean
  updated_at: string
}

interface Props {
  initialTodos: Todo[]
  initialNotes: Note[]
  workspaceId: string
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-zinc-200 text-zinc-500',
  2: 'bg-blue-100 text-blue-600',
  3: 'bg-amber-100 text-amber-600',
  4: 'bg-orange-100 text-orange-600',
  5: 'bg-red-100 text-red-600',
}

export function NotesClient({ initialTodos, initialNotes, workspaceId }: Props) {
  const [tab, setTab] = useState<'todos' | 'notes'>('todos')
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [showNewNote, setShowNewNote] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteBody, setNewNoteBody] = useState('')
  const [, startTransition] = useTransition()

  const [optimisticTodos, applyOptimistic] = useOptimistic(
    todos,
    (state: Todo[], id: string) =>
      state.map((t) => (t.id === id ? { ...t, status: 'done' as const } : t)),
  )

  async function completeTodo(id: string) {
    startTransition(() => {
      applyOptimistic(id)
    })
    const res = await fetch(`/api/v1/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    if (res.ok) {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'done' } : t)))
    }
  }

  async function addTodo() {
    if (!newTodoTitle.trim()) return
    setAddingTodo(true)
    const res = await fetch('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, title: newTodoTitle.trim() }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setTodos((prev) => [data, ...prev])
      setNewTodoTitle('')
    }
    setAddingTodo(false)
  }

  function startEditNote(note: Note) {
    setEditingNoteId(note.id)
    setEditTitle(note.title ?? '')
    setEditBody(note.body ?? '')
  }

  async function saveNote() {
    if (!editingNoteId) return
    const res = await fetch(`/api/v1/notes/${editingNoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, body: editBody }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === data.id ? data : n)))
    }
    setEditingNoteId(null)
  }

  async function addNote() {
    if (!newNoteTitle.trim() && !newNoteBody.trim()) return
    const res = await fetch('/api/v1/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, title: newNoteTitle, body: newNoteBody }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setNotes((prev) => [data, ...prev])
      setNewNoteTitle('')
      setNewNoteBody('')
      setShowNewNote(false)
    }
  }

  const openTodos = optimisticTodos.filter((t) => t.status === 'open')
  const doneTodos = optimisticTodos.filter((t) => t.status === 'done')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Notas y Tareas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {openTodos.length} tareas abiertas · {notes.length} notas
          </p>
        </div>
        <button
          onClick={() => {
            if (tab === 'todos') {
              setNewTodoTitle('')
              document.getElementById('new-todo-input')?.focus()
            } else {
              setShowNewNote(true)
            }
          }}
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        <button
          onClick={() => setTab('todos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'todos'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Tareas
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'notes'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <StickyNote className="h-4 w-4" />
          Notas
        </button>
      </div>

      {/* Todos tab */}
      {tab === 'todos' && (
        <div className="space-y-4">
          {/* Quick add */}
          <div className="flex gap-2">
            <input
              id="new-todo-input"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
              placeholder="Agregar tarea rápida..."
              className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
            <button
              onClick={addTodo}
              disabled={addingTodo || !newTodoTitle.trim()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-zinc-800"
            >
              {addingTodo ? '...' : 'Agregar'}
            </button>
          </div>

          {openTodos.length === 0 && doneTodos.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-zinc-500">Sin tareas. Agrega una arriba.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {openTodos.map((todo) => {
                const dueDate = todo.due_date ? parseISO(todo.due_date) : null
                const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate)
                return (
                  <div key={todo.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                    <button
                      onClick={() => completeTodo(todo.id)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-zinc-300 hover:border-green-500 transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{todo.title}</p>
                      {todo.notes && <p className="text-xs text-zinc-500 truncate">{todo.notes}</p>}
                    </div>
                    {dueDate && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        isOverdue ? 'bg-red-100 text-red-600' : isToday(dueDate) ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {format(dueDate, 'd MMM', { locale: es })}
                      </span>
                    )}
                    <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${PRIORITY_COLORS[todo.priority] ?? PRIORITY_COLORS[3]}`}>
                      {todo.priority}
                    </span>
                  </div>
                )
              })}

              {doneTodos.length > 0 && (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Completadas ({doneTodos.length})</p>
                  {doneTodos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 opacity-60">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-green-400 bg-green-50">
                        <Check className="h-3 w-3 text-green-600" />
                      </span>
                      <p className="flex-1 text-sm text-zinc-500 line-through">{todo.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="space-y-4">
          {/* New note form */}
          {showNewNote && (
            <div className="rounded-xl border border-zinc-300 bg-white p-4 space-y-3">
              <input
                autoFocus
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Título"
                className="w-full text-sm font-medium outline-none placeholder-zinc-400"
              />
              <textarea
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                placeholder="Escribe algo..."
                rows={4}
                className="w-full resize-none text-sm text-zinc-700 outline-none placeholder-zinc-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewNote(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={addNote}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          {notes.length === 0 && !showNewNote ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
              <StickyNote className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-zinc-500">Sin notas. Crea una con el botón "Nuevo".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => editingNoteId !== note.id && startEditNote(note)}
                  className={`relative rounded-xl border bg-white p-4 transition-shadow hover:shadow-md cursor-pointer ${
                    note.pinned ? 'border-amber-300' : 'border-zinc-200'
                  }`}
                >
                  {note.pinned && (
                    <Pin className="absolute right-3 top-3 h-3.5 w-3.5 text-amber-400" />
                  )}

                  {editingNoteId === note.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-sm font-semibold outline-none"
                        placeholder="Título"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={5}
                        className="w-full resize-none text-sm text-zinc-600 outline-none"
                        placeholder="Contenido..."
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-700"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveNote}
                          className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {note.title && (
                        <h3 className="mb-1 text-sm font-semibold text-zinc-900 line-clamp-1">{note.title}</h3>
                      )}
                      {note.body && (
                        <p className="text-xs text-zinc-500 line-clamp-4">{note.body}</p>
                      )}
                      {!note.title && !note.body && (
                        <p className="text-xs text-zinc-400 italic">Nota vacía</p>
                      )}
                      <p className="mt-3 text-[10px] text-zinc-400">
                        {format(parseISO(note.updated_at), "d MMM yyyy", { locale: es })}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
