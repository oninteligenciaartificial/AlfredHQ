// Instagram Graph API integration
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api

const GRAPH_API_BASE = 'https://graph.facebook.com/v20.0'

export async function getInstagramAuthUrl(appId: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages,pages_read_engagement',
    response_type: 'code',
  })
  return `https://www.facebook.com/v20.0/dialog/oauth?${params}`
}

export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
) {
  const tokenUrl = `${GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })

  const res = await fetch(tokenUrl)
  if (!res.ok) throw new Error('Failed to exchange code for token')
  return res.json()
}

export async function getInstagramProfile(accessToken: string) {
  const res = await fetch(`${GRAPH_API_BASE}/me?fields=id,username,profile_picture_url&access_token=${accessToken}`)
  if (!res.ok) throw new Error('Failed to fetch Instagram profile')
  return res.json()
}

export async function getInstagramInsights(accessToken: string, accountId: string, period = 'day') {
  const res = await fetch(
    `${GRAPH_API_BASE}/${accountId}/insights?metric=follower_count,impressions,reach,profile_views&period=${period}&access_token=${accessToken}`
  )
  if (!res.ok) throw new Error('Failed to fetch Instagram insights')
  return res.json()
}

export async function publishInstagramImage(accessToken: string, accountId: string, imageUrl: string, caption: string) {
  // Step 1: Create media container
  const createRes = await fetch(`${GRAPH_API_BASE}/${accountId}/media?` + new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  }), { method: 'POST' })

  if (!createRes.ok) throw new Error('Failed to create media container')
  const { id: containerId } = await createRes.json()

  // Step 2: Publish
  const publishRes = await fetch(`${GRAPH_API_BASE}/${accountId}/media_publish?` + new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  }), { method: 'POST' })

  if (!publishRes.ok) throw new Error('Failed to publish Instagram post')
  return publishRes.json()
}

export async function publishInstagramReel(accessToken: string, accountId: string, videoUrl: string, caption: string) {
  // Step 1: Initialize upload
  const initRes = await fetch(`${GRAPH_API_BASE}/${accountId}/video?` + new URLSearchParams({
    video_url: videoUrl,
    caption,
    access_token: accessToken,
  }), { method: 'POST' })

  if (!initRes.ok) throw new Error('Failed to initialize reel upload')
  const { id: containerId } = await initRes.json()

  // Step 2: Publish
  const publishRes = await fetch(`${GRAPH_API_BASE}/${accountId}/media_publish?` + new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  }), { method: 'POST' })

  if (!publishRes.ok) throw new Error('Failed to publish Instagram reel')
  return publishRes.json()
}

export async function replyToComment(accessToken: string, commentId: string, replyText: string) {
  const res = await fetch(`${GRAPH_API_BASE}/${commentId}/replies?` + new URLSearchParams({
    message: replyText,
    access_token: accessToken,
  }), { method: 'POST' })

  if (!res.ok) throw new Error('Failed to reply to comment')
  return res.json()
}
