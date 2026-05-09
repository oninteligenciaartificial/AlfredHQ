// LinkedIn API v2 integration
// Docs: https://learn.microsoft.com/en-us/linkedin/

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'

export async function getLinkedInAuthUrl(clientId: string, redirectUri: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'w_member_social r_organization_social rw_organization_admin openid profile email',
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
) {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) throw new Error('Failed to exchange code for token')
  return res.json()
}

export async function getLinkedInProfile(accessToken: string) {
  const res = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error('Failed to fetch LinkedIn profile')
  return res.json()
}

export async function getLinkedInOrganizations(accessToken: string) {
  const res = await fetch(`${LINKEDIN_API_BASE}/organizations?q=roleAssignment&role=ADMINISTRATOR&projection=(elements*(localizedName,vanityName,logoV2(original~:playableStreams)))`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error('Failed to fetch LinkedIn organizations')
  return res.json()
}

export async function publishLinkedInPost(
  accessToken: string,
  organizationId: string,
  text: string,
  imageUrl?: string
) {
  const body: Record<string, unknown> = {
    author: `urn:li:organization:${organizationId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
        media: imageUrl
          ? [{ status: 'READY', description: { text: '' }, originalUrl: imageUrl }]
          : [],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error('Failed to publish LinkedIn post')
  return res.json()
}

export async function getLinkedInOrganizationStats(accessToken: string, organizationId: string) {
  const res = await fetch(
    `${LINKEDIN_API_BASE}/organizationPageStatistics?q=organization&organization=urn%3Ali%3Aorganization%3A${organizationId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!res.ok) throw new Error('Failed to fetch LinkedIn organization stats')
  return res.json()
}
