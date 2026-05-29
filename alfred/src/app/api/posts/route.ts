import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postSchema } from '@/lib/validation/schemas'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { auditLog } from '@/lib/audit'
import { getCurrentUser, getUserWorkspace, ALLOWED_POST_FIELDS, filterAllowedFields } from '@/lib/security/authorization'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('content_posts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (err) throw new AppError(err.message, 500, 'FETCH_FAILED')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const validated = postSchema.parse(body)

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) throw new AppError('workspace_id required', 400, 'MISSING_PARAM')

    await getUserWorkspace(user.id, workspaceId)

    // Infer media type if not explicitly provided
    let mediaType = validated.media_type
    if (!mediaType) {
      if (validated.media_urls && validated.media_urls.length > 0) {
        if (validated.media_urls.length > 1) {
          mediaType = 'carousel'
        } else {
          const url = validated.media_urls[0].toLowerCase()
          if (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.avi')) {
            mediaType = 'video'
          } else {
            mediaType = 'image'
          }
        }
      } else {
        mediaType = 'text'
      }
    }

    const defaultStatus = validated.scheduled_at ? 'scheduled' : 'draft'

    const supabase = await createClient()
    const { data, error: err } = await supabase
      .from('content_posts')
      .insert({
        workspace_id: workspaceId,
        caption: validated.caption || null,
        media_urls: validated.media_urls || null,
        media_type: mediaType,
        scheduled_at: validated.scheduled_at || null,
        networks: validated.networks,
        status: defaultStatus,
      } as never)
      .select()
      .single()

    if (err) throw new AppError(err.message, 500, 'CREATE_FAILED')

    const insertedPost = data as { id: string }

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId,
      action: 'POST_CREATE',
      resource: insertedPost.id,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
