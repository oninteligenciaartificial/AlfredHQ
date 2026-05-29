import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getLinkedInProfile } from '@/lib/social/linkedin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (errorParam || !code) {
    return NextResponse.redirect(`${appUrl}/settings/accounts?error=linkedin_failed`)
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings/accounts?error=linkedin_failed`)
  }

  try {
    const redirectUri = `${appUrl}/api/social/callback/linkedin`

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri)
    const accessToken: string = tokenData.access_token
    const expiresIn: number = tokenData.expires_in ?? 5183944 // ~60 days default
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Get LinkedIn profile
    const profile = await getLinkedInProfile(accessToken)
    const accountId: string = profile.sub ?? profile.id ?? 'unknown'
    const firstName: string = profile.given_name ?? profile.localizedFirstName ?? ''
    const lastName: string = profile.family_name ?? profile.localizedLastName ?? ''
    const displayName = `${firstName} ${lastName}`.trim() || 'LinkedIn User'
    const username = profile.email ?? displayName

    // Get authenticated user and workspace
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(`${appUrl}/settings/accounts?error=linkedin_failed`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace, error: wsError } = await (supabase as any)
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (wsError || !workspace) {
      return NextResponse.redirect(`${appUrl}/settings/accounts?error=linkedin_failed`)
    }

    // Upsert social account
    const { error: upsertError } = await supabase
      .from('social_accounts')
      .upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {
          workspace_id: workspace.id,
          network: 'linkedin',
          account_id: accountId,
          username,
          display_name: displayName,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_at: new Date().toISOString(),
        } as any,
        { onConflict: 'workspace_id,network' }
      )

    if (upsertError) {
      return NextResponse.redirect(`${appUrl}/settings/accounts?error=linkedin_failed`)
    }

    return NextResponse.redirect(`${appUrl}/settings/accounts?connected=linkedin`)
  } catch {
    return NextResponse.redirect(`${appUrl}/settings/accounts?error=linkedin_failed`)
  }
}
