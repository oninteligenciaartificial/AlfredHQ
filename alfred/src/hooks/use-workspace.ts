'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Workspace } from '@/types'

const STORAGE_KEY = 'alfred_active_workspace_id'

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const { data, error: err } = await supabase
        .from('workspaces')
        .select('id, name, owner_id, plan, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })

      if (err) throw new Error(err.message)

      const list = (data ?? []) as Workspace[]
      setWorkspaces(list)

      // Restore last active workspace from localStorage
      const savedId = typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null

      const active =
        list.find((w) => w.id === savedId) ?? list[0] ?? null

      setWorkspace(active)

      // Persist the resolved selection
      if (active && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, active.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workspaces')
    } finally {
      setLoading(false)
    }
  }, [])

  const switchWorkspace = useCallback((id: string) => {
    const target = workspaces.find((w) => w.id === id)
    if (!target) return
    setWorkspace(target)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [workspaces])

  const createWorkspace = useCallback(async (name: string): Promise<Workspace | null> => {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create workspace')

      const newWorkspace = json.data as Workspace
      setWorkspaces((prev) => [...prev, newWorkspace])
      setWorkspace(newWorkspace)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, newWorkspace.id)
      }
      return newWorkspace
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
      return null
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return {
    workspace,
    workspaces,
    loading,
    error,
    switchWorkspace,
    createWorkspace,
    refetch: fetchWorkspaces,
  }
}
