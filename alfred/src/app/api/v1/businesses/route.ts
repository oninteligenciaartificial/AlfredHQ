import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { checkRateLimit } from '@/lib/security/rate-limit'
import * as businessRepo from '@/lib/businesses/repository'

const createBusinessSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  nit: z.string().optional(),
  tax_regime: z.enum(['general', 'simplificado', 'rc_iva']).optional(),
  currency: z.string().default('BOB'),
})

// GET /api/v1/businesses?workspace_id=<id> — list active businesses
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    const rateLimit = await checkRateLimit(user.id, 'protected')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const data = await businessRepo.findAll(supabase, workspaceId)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

// POST /api/v1/businesses?workspace_id=<id> — create a business
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    const rateLimit = await checkRateLimit(user.id, 'protected')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')
    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const body = await request.json()
    const validated = createBusinessSchema.parse(body)

    const supabase = await createClient()
    const data = await businessRepo.create(supabase, workspaceId, validated)

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
