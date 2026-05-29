'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Settings,
  LogOut,
  Bot,
  ChevronDown,
  Plus,
  Building2,
  Check,
  CreditCard,
  Bell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import type { Workspace } from '@/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/payments', label: 'Pagos', icon: CreditCard },
  { href: '/notes', label: 'Tareas & Notas', icon: CheckSquare },
  { href: '/calendar', label: 'Tributario', icon: Calendar },
  { href: '/alerts', label: 'Alertas', icon: Bell },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

const PLAN_BADGE: Record<string, { label: string; classes: string }> = {
  internal: { label: 'Internal', classes: 'bg-purple-100 text-purple-700' },
  starter:  { label: 'Starter',  classes: 'bg-zinc-100  text-zinc-600'  },
  pro:      { label: 'Pro',      classes: 'bg-amber-100  text-amber-700' },
}

function WorkspaceSwitcher({
  workspace,
  workspaces,
  onSwitch,
  onCreate,
}: {
  workspace: Workspace | null
  workspaces: Workspace[]
  onSwitch: (id: string) => void
  onCreate: (name: string) => Promise<Workspace | null>
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    await onCreate(newName.trim())
    setNewName('')
    setSaving(false)
    setCreating(false)
    setOpen(false)
  }

  const badge = workspace ? (PLAN_BADGE[workspace.plan] ?? PLAN_BADGE.starter) : PLAN_BADGE.starter

  return (
    <div ref={ref} className="relative px-3 py-3 border-b border-zinc-200">
      <button
        id="workspace-switcher-btn"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-100 transition-colors text-left group"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white text-xs font-bold shrink-0">
          {workspace?.name?.charAt(0)?.toUpperCase() ?? 'A'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 leading-tight">
            {workspace?.name ?? 'Cargando…'}
          </p>
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.classes}`}>
            {badge.label}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="px-2 py-1.5">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Tus workspaces
            </p>
            {workspaces.map((w) => (
              <button
                key={w.id}
                role="option"
                aria-selected={w.id === workspace?.id}
                onClick={() => { onSwitch(w.id); setOpen(false) }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-50 transition-colors text-left"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-white text-[10px] font-bold shrink-0">
                  {w.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-sm text-zinc-800">{w.name}</span>
                {w.id === workspace?.id && (
                  <Check className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-100 px-2 py-1.5">
            {creating ? (
              <div className="flex gap-1.5 px-2 py-1">
                <input
                  id="new-workspace-name-input"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  placeholder="Nombre del workspace"
                  className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs outline-none focus:border-zinc-400"
                />
                <button
                  id="save-workspace-btn"
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                >
                  {saving ? '…' : 'Crear'}
                </button>
              </div>
            ) : (
              <button
                id="add-workspace-btn"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-50 transition-colors text-zinc-600 hover:text-zinc-900"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Nuevo workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { workspace, workspaces, loading, switchWorkspace, createWorkspace } = useWorkspace()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-zinc-50">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white">
        {/* Workspace Switcher Header */}
        {!loading && (
          <WorkspaceSwitcher
            workspace={workspace}
            workspaces={workspaces}
            onSwitch={switchWorkspace}
            onCreate={createWorkspace}
          />
        )}
        {loading && (
          <div className="flex h-[73px] items-center gap-3 px-5 border-b border-zinc-200">
            <div className="h-8 w-8 rounded-md bg-zinc-200 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-zinc-200 animate-pulse" />
              <div className="h-2 w-12 rounded bg-zinc-100 animate-pulse" />
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-zinc-200 p-3 space-y-1">
          <Link
            href="/settings/billing"
            id="nav-billing"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === '/settings/billing'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Facturación
          </Link>
          <Link
            href="/settings/accounts"
            id="nav-settings"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/settings') && pathname !== '/settings/billing'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>

        {/* Active workspace pill at bottom */}
        {workspace && (
          <div className="px-4 py-3 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-zinc-400">
              <Building2 className="h-3 w-3 shrink-0" />
              <p className="truncate text-[10px]">{workspace.id}</p>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            {navItems.find((item) => item.href === pathname)?.label ||
              (pathname === '/settings/billing' ? 'Facturación' : 'Settings')}
          </h2>
          {workspace && (
            <span className="text-xs text-zinc-400 font-mono">{workspace.name}</span>
          )}
        </header>
        <div className="p-6">{children}</div>
      </main>

      <Link
        href="/agent"
        className={`fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-all hover:scale-110 hover:bg-zinc-800 ${
          pathname === '/agent' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Abrir agente Alfred"
      >
        <Bot className="h-6 w-6" />
      </Link>
    </div>
  )
}
