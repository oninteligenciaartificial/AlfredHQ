import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getInstagramProfile } from '@/lib/social/instagram'
import { createClient } from '@/lib/supabase/server'

const GRAPH_API_BASE = 'https://graph.facebook.com/v20.0'

async function getLongLivedToken(shortLivedToken: string, appId: string, appSecret: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  })

  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to exchange for long-lived token')
  const data = await res.json()
  return data.access_token as string
}

async function getInstagramBusinessAccountId(pageAccessToken: string, pageId: string): Promise<string | null> {
  const res = await fetch(
    `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  )
  if (!res.ok) return null
  const data = await res.json()
  return (data.instagram_business_account?.id as string) ?? null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (errorParam || !code) {
    return NextResponse.redirect(`${appUrl}/settings/accounts?error=instagram_failed`)
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${appUrl}/settings/accounts?error=instagram_failed`)
  }

  try {
    const redirectUri = `${appUrl}/api/social/callback/instagram`

    // Exchange code for short-lived token
    const tokenData = await exchangeCodeForToken(code, appId, appSecret, redirectUri)
    const shortLivedToken: string = tokenData.access_token

    // Exchange for long-lived token (60 days)
    const longLivedToken = await getLongLivedToken(shortLivedToken, appId, appSecret)
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // Get Facebook pages to find linked Instagram Business Account
    const pagesRes = await fetch(
      `${GRAPH_API_BASE}/me/accounts?access_token=${longLivedToken}`
    )
    if (!pagesRes.ok) throw new Error('Failed to fetch Facebook pages')
    const pagesData = await pagesRes.json()
    const pages: Array<{ id: string; access_token: string }> = pagesData.data ?? []

    let instagramAccountId: string | null = null
    let pageAccessToken = longLivedToken

    for (const page of pages) {
      const igId = await getInstagramBusinessAccountId(page.access_token, page.id)
      if (igId) {
        instagramAccountId = igId
        pageAccessToken = page.access_token
        break
      }
    }

    // Get Instagram profile
    const profile = await getInstagramProfile(pageAccessToken)
    const username: string = profile.username ?? instagramAccountId ?? 'instagram'
    const accountId: string = instagramAccountId ?? profile.id ?? 'unknown'

    // Get authenticated user and workspace
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(`${appUrl}/settings/accounts?error=instagram_failed`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace, error: wsError } = await (supabase as any)
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (wsError || !workspace) {
      return NextResponse.redirect(`${appUrl}/settings/accounts?error=instagram_failed`)
    }

    // Upsert social account
    const { error: upsertError } = await supabase
      .from('social_accounts')
      .upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {
          workspace_id: workspace.id,
          network: 'instagram',
          account_id: accountId,
          username,
          display_name: username,
          access_token: longLivedToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_at: new Date().toISOString(),
        } as any,
        { onConflict: 'workspace_id,network' }
      )

    if (upsertError) {
      return NextResponse.redirect(`${appUrl}/settings/accounts?error=instagram_failed`)
    }

    return NextResponse.redirect(`${appUrl}/settings/accounts?connected=instagram`)
  } catch {
    return NextResponse.redirect(`${appUrl}/settings/accounts?error=instagram_failed`)
  }
}
