// TikTok Content Posting API integration
// Docs: https://developers.tiktok.com/doc/

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2'

export async function getTikTokAuthUrl(clientKey: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    scope: 'video.publish,video.upload,comment.list,comment.list.manage',
    response_type: 'code',
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`
}

export async function exchangeCodeForToken(
  code: string,
  clientKey: string,
  clientSecret: string,
  redirectUri: string
) {
  const res = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) throw new Error('Failed to exchange code for token')
  return res.json()
}

export async function refreshTikTokToken(refreshToken: string, clientKey: string, clientSecret: string) {
  const res = await fetch(`${TIKTOK_API_BASE}/oauth/refresh_token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) throw new Error('Failed to refresh TikTok token')
  return res.json()
}

export async function getTikTokProfile(accessToken: string) {
  const res = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error('Failed to fetch TikTok profile')
  return res.json()
}

export async function uploadTikTokVideo(accessToken: string, videoUrl: string, title: string, description: string) {
  const res = await fetch(`${TIKTOK_API_BASE}/video/upload/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      video_url: videoUrl,
      title,
      description,
      privacy_level: 'MUTUAL_FOLLOW_FRIENDS',
    }),
  })

  if (!res.ok) throw new Error('Failed to upload TikTok video')
  return res.json()
}

export async function getTikTokAnalytics(accessToken: string, videoId: string) {
  const res = await fetch(`${TIKTOK_API_BASE}/video/analytics/?video_id=${videoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error('Failed to fetch TikTok analytics')
  return res.json()
}
