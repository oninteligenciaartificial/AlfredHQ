'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agent', label: 'Agente', icon: MessageSquare },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/planner', label: 'Planner', icon: Calendar },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [workspaceName, setWorkspaceName] = useState('Alfred')

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    async function loadWorkspace() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('workspaces')
          .select('name')
          .eq('owner_id', user.id)
          .single()
        if (data && typeof data === 'object' && 'name' in data) {
          setWorkspaceName(String((data as Record<string, unknown>).name))
        }
      }
    }
    loadWorkspace()
  }, [])

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white">
        <div className="flex h-16 items-center border-b border-zinc-200 px-6">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">{workspaceName}</h1>
        </div>

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
            href="/settings/accounts"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/settings')
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            {navItems.find((item) => item.href === pathname)?.label || 'Settings'}
          </h2>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
