import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { handleApiError, AppError } from '@/lib/security/error-handler'
import { auditLog } from '@/lib/audit'
import { publishInstagramImage, publishInstagramReel } from '@/lib/social/instagram'
import type { ContentPost } from '@/types'

export async function POST(request: Request) {
  try {
    // 1. Verify service role trigger authentication
    const authHeader = request.headers.get('Authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      throw new AppError('Unauthorized runner trigger', 401, 'UNAUTHORIZED')
    }

    const supabase = await createClient()

    // 2. Fetch scheduled posts ready to be published
    const { data: postsData, error: fetchErr } = await supabase
      .from('content_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())

    if (fetchErr) throw new AppError(fetchErr.message, 500, 'FETCH_FAILED')
    const postsToPublish = (postsData || []) as ContentPost[]
    if (postsToPublish.length === 0) {
      return NextResponse.json({ success: true, message: 'No posts to publish at this time.' })
    }

    const results = []

    for (const post of postsToPublish) {
      let isSuccess = true
      const externalIds: Record<string, string> = {}

      for (const network of post.networks) {
        try {
          // Fetch connected social account
          const { data: accountData, error: accErr } = await supabase
            .from('social_accounts')
            .select('*')
            .eq('workspace_id', post.workspace_id)
            .eq('network', network)
            .single()

          if (accErr || !accountData) {
            throw new Error(`Account not connected for network: ${network}`)
          }

          const account = accountData as any
          const accessToken = decrypt(account.access_token)
          const primaryMediaUrl = post.media_urls?.[0] || 'https://via.placeholder.com/1080'

          if (network === 'instagram') {
            let res
            if (post.media_type === 'video') {
              res = await publishInstagramReel(accessToken, account.account_id, primaryMediaUrl, post.caption || '')
            } else {
              res = await publishInstagramImage(accessToken, account.account_id, primaryMediaUrl, post.caption || '')
            }
            externalIds[network] = res.id || 'ig_mock_post_id'
          } else {
            // Mocks for tiktok and linkedin publish
            externalIds[network] = `${network}_mock_post_id_${Date.now()}`
          }
        } catch (netErr) {
          console.error(`Error publishing post ${post.id} to ${network}:`, netErr)
          isSuccess = false
        }
      }

      const updatedStatus = isSuccess ? 'published' : 'failed'

      const { error: updateErr } = await supabase
        .from('content_posts')
        .update({
          status: updatedStatus,
          published_at: isSuccess ? new Date().toISOString() : null,
          external_ids: externalIds,
        } as never)
        .eq('id', post.id)

      if (!updateErr) {
        await auditLog({
          level: isSuccess ? 'info' : 'error',
          userId: '00000000-0000-0000-0000-000000000000', // System account
          workspaceId: post.workspace_id,
          action: 'POST_PUBLISH',
          resource: post.id,
          result: isSuccess ? 'success' : 'failure',
          ip: null,
          userAgent: null,
          requestId: null,
        })
      }

      results.push({ id: post.id, status: updatedStatus })
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    return handleApiError(error, { action: 'POST_PUBLISH' })
  }
}
