import { NextResponse } from 'next/server'
import { getLinkedInAuthUrl } from '@/lib/social/linkedin'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: 'LinkedIn OAuth not configured' },
      { status: 500 }
    )
  }

  const redirectUri = `${appUrl}/api/social/callback/linkedin`
  const authUrl = await getLinkedInAuthUrl(clientId, redirectUri)

  return NextResponse.redirect(authUrl)
}
