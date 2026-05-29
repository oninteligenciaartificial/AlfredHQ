import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { auditLog, getIpFromRequest, getUserAgent } from '@/lib/audit'
import { getCurrentUser, ALLOWED_WORKSPACE_FIELDS, filterAllowedFields } from '@/lib/security/authorization'
import { z } from 'zod'

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80).trim(),
})

// GET /api/workspaces — list all workspaces owned by the authenticated user
export async function GET() {
  try {
    const user = await getCurrentUser()

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('workspaces')
      .select('id, name, plan, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })

    if (err) throw new AppError(err.message, 500, 'FETCH_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

// POST /api/workspaces — create a new workspace for the authenticated user
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const validated = createWorkspaceSchema.parse(body)

    const supabase = await createClient()

    // Enforce a hard limit — one free workspace, extra workspaces require a paid plan
    const { count, error: countErr } = await supabase
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    if (countErr) throw new AppError(countErr.message, 500, 'FETCH_FAILED')
    if ((count ?? 0) >= 5) {
      throw new AppError('Workspace limit reached (max 5)', 403, 'LIMIT_REACHED')
    }

    const { data, error: err } = await supabase
      .from('workspaces')
      .insert({
        name: validated.name,
        owner_id: user.id,
        plan: 'starter',
      } as never)
      .select('id, name, plan, created_at')
      .single()

    if (err) throw new AppError(err.message, 500, 'CREATE_FAILED')

    const inserted = data as { id: string }

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId: inserted.id,
      action: 'WORKSPACE_CREATE',
      resource: inserted.id,
      result: 'success',
      ip: getIpFromRequest(request),
      userAgent: getUserAgent(request),
      requestId: null,
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { action: 'WORKSPACE_CREATE' })
  }
}

// PATCH /api/workspaces?id=<workspaceId> — rename a workspace
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) throw new AppError('id required', 400, 'MISSING_PARAM')

    // Verify ownership before patching
    const supabase = await createClient()
    const { data: existing, error: ownerErr } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single()

    if (ownerErr || !existing) {
      throw new AppError('Workspace not found or access denied', 403, 'FORBIDDEN')
    }

    const filtered = filterAllowedFields(body, ALLOWED_WORKSPACE_FIELDS)
    if (Object.keys(filtered).length === 0) {
      throw new AppError('No valid fields to update', 400, 'INVALID_PAYLOAD')
    }

    const { data, error: err } = await supabase
      .from('workspaces')
      .update(filtered as never)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('id, name, plan, created_at')
      .single()

    if (err) throw new AppError(err.message, 500, 'UPDATE_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
