import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { checkRateLimit } from '@/lib/security/rate-limit'
import * as businessRepo from '@/lib/businesses/repository'

const patchBusinessSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  nit: z.string().optional(),
  tax_regime: z.enum(['general', 'simplificado', 'rc_iva']).optional(),
  currency: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

async function resolveContext(request: Request, params: RouteParams['params']) {
  const user = await getCurrentUser()

  const rateLimit = await checkRateLimit(user.id, 'protected')
  if (!rateLimit.allowed) {
    throw new AppError('Rate limit exceeded', 429, 'RATE_LIMITED')
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

  await getUserWorkspace(user.id, workspaceId)

  const { id } = await params
  return { user, workspaceId, id }
}

// GET /api/v1/businesses/:id?workspace_id=<id>
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId, id } = await resolveContext(request, params)

    const supabase = await createClient()
    const data = await businessRepo.findById(supabase, workspaceId, id)

    if (!data) throw new AppError('Business not found', 404, 'NOT_FOUND')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

// PATCH /api/v1/businesses/:id?workspace_id=<id>
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId, id } = await resolveContext(request, params)

    const body = await request.json()
    const validated = patchBusinessSchema.parse(body)

    if (Object.keys(validated).length === 0) {
      throw new AppError('No valid fields to update', 400, 'INVALID_PAYLOAD')
    }

    // Verify resource exists and belongs to workspace before updating
    const supabase = await createClient()
    const existing = await businessRepo.findById(supabase, workspaceId, id)
    if (!existing) throw new AppError('Business not found', 404, 'NOT_FOUND')

    const data = await businessRepo.update(supabase, workspaceId, id, validated)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

// DELETE /api/v1/businesses/:id?workspace_id=<id> — soft delete
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId, id } = await resolveContext(request, params)

    const supabase = await createClient()
    const existing = await businessRepo.findById(supabase, workspaceId, id)
    if (!existing) throw new AppError('Business not found', 404, 'NOT_FOUND')

    await businessRepo.softDelete(supabase, workspaceId, id)

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
