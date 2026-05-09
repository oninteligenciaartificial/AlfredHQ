// SSRF Prevention: Validate and sanitize URLs before making server-side requests

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fe80:/,
  /^fc00:/,
  /^fd00:/,
]

const CLOUD_METADATA_ENDPOINTS = [
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.azure.com',
  '100.100.100.200',
  'metadata.oraclecloud.com',
]

export function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(pattern => pattern.test(ip))
}

export function isCloudMetadataEndpoint(hostname: string): boolean {
  return CLOUD_METADATA_ENDPOINTS.some(endpoint =>
    hostname === endpoint || hostname.endsWith(`.${endpoint}`)
  )
}

export async function validateExternalUrl(
  url: string,
  allowedDomains?: string[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    const parsed = new URL(url)

    // Only allow HTTPS for external requests
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs allowed' }
    }

    // Check against allowed domains whitelist
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain => {
        if (domain.startsWith('*.')) {
          return parsed.hostname.endsWith(domain.slice(1))
        }
        return parsed.hostname === domain
      })
      if (!isAllowed) {
        return { valid: false, error: `Domain ${parsed.hostname} not in allowed list` }
      }
    }

    // Block cloud metadata endpoints
    if (isCloudMetadataEndpoint(parsed.hostname)) {
      return { valid: false, error: 'Cloud metadata endpoint blocked' }
    }

    // Resolve DNS and check IP (in production, use dns.lookup)
    // For now, check hostname patterns
    if (isPrivateIP(parsed.hostname)) {
      return { valid: false, error: 'Private IP address blocked' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

export const SAFE_FETCH_TIMEOUT = 10000 // 10 seconds
export const MAX_REDIRECTS = 0 // No automatic redirects for SSRF prevention

export async function safeFetch(
  url: string,
  options: RequestInit & { allowedDomains?: string[] } = {}
): Promise<Response> {
  const { allowedDomains, ...fetchOptions } = options

  const validation = await validateExternalUrl(url, allowedDomains)
  if (!validation.valid) {
    throw new Error(`SSRF prevention: ${validation.error}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SAFE_FETCH_TIMEOUT)

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      redirect: 'manual', // Prevent automatic redirects
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
