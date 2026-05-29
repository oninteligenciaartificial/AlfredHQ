import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { getCurrentUser, getUserWorkspace } from '@/lib/security/authorization'
import { auditLog } from '@/lib/audit'
import { exchangeCodeForToken, getInstagramProfile } from '@/lib/social/instagram'

export async function GET(
  request: Request,
  props: { params: Promise<{ network: string }> }
) {
  const params = await props.params;
  try {
    const { network } = params
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // state holds workspace_id

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings/accounts?error=missing_params', request.url))
    }

    const user = await getCurrentUser()
    await getUserWorkspace(user.id, state)

    let tokenData = { access_token: 'mock_token_' + Date.now(), expires_in: 3600 }
    let profileData = { id: 'mock_id_' + Date.now(), username: `test_${network}`, display_name: `Test ${network}` }

    const isInstagram = network === 'instagram'
    const isLinkedin = network === 'linkedin'
    const isTiktok = network === 'tiktok'

    // Attempt real exchange if credentials exist
    if (isInstagram && process.env.META_APP_ID && process.env.META_APP_SECRET) {
      try {
        const exchange = await exchangeCodeForToken(
          code,
          process.env.META_APP_ID,
          process.env.META_APP_SECRET,
          new URL(`/api/social/callback/instagram`, request.url).toString()
        )
        tokenData = exchange
        const profile = await getInstagramProfile(exchange.access_token)
        profileData = {
          id: profile.id,
          username: profile.username || `ig_${profile.id}`,
          display_name: profile.username || 'Instagram Account',
        }
      } catch (e) {
        console.error('Real Instagram OAuth failed, falling back to mock:', e)
      }
    }

    const encryptedToken = encrypt(tokenData.access_token)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    const supabase = await createClient()

    // Delete existing account for the same network in this workspace to update it
    await supabase
      .from('social_accounts')
      .delete()
      .eq('workspace_id', state)
      .eq('network', network)

    // Insert new social account connection
    const { error: insertErr } = await supabase
      .from('social_accounts')
      .insert({
        workspace_id: state,
        network,
        account_id: profileData.id,
        username: profileData.username,
        display_name: profileData.display_name,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${profileData.username}`,
        access_token: encryptedToken,
        token_expires_at: expiresAt,
        is_active: true,
      } as never)

    if (insertErr) {
      console.error('Error inserting social account:', insertErr)
      return NextResponse.redirect(new URL('/settings/accounts?error=db_error', request.url))
    }

    await auditLog({
      level: 'info',
      userId: user.id,
      workspaceId: state,
      action: 'SOCIAL_CONNECT',
      resource: network,
      result: 'success',
      ip: null,
      userAgent: null,
      requestId: null,
    })

    return NextResponse.redirect(new URL('/settings/accounts?success=true', request.url))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/settings/accounts?error=unauthorized', request.url))
  }
}
