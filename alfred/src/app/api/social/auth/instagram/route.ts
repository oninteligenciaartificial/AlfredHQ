import { NextResponse } from 'next/server'
import { getInstagramAuthUrl } from '@/lib/social/instagram'

export async function GET() {
  const appId = process.env.META_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appId || !appUrl) {
    return NextResponse.json(
      { error: 'Instagram OAuth not configured' },
      { status: 500 }
    )
  }

  const redirectUri = `${appUrl}/api/social/callback/instagram`
  const authUrl = await getInstagramAuthUrl(appId, redirectUri)

  return NextResponse.redirect(authUrl)
}
