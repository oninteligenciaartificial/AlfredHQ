// Input sanitization: XSS prevention, path traversal, dangerous character filtering

import DOMPurify from 'isomorphic-dompurify'

// Initialize DOMPurify for server-side use
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
  })
}

export function sanitizeText(input: string): string {
  // Strip HTML tags, trim whitespace
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\p{P}\p{S}\s]/gu, '')
    .trim()
    .slice(0, 10000)
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '')
    .slice(0, 255)
}

export function sanitizePath(path: string): string {
  // Prevent path traversal
  const normalized = path.replace(/\.{2,}/g, '').replace(/^\//, '')
  return normalized.replace(/[<>:"|?*\x00-\x1f]/g, '')
}

export function containsDangerousChars(input: string): boolean {
  const dangerousPatterns = [
    /--/,           // SQL comment
    /;/,            // SQL statement separator
    /<script/i,     // XSS
    /javascript:/i, // XSS
    /on\w+\s*=/i,   // Event handler XSS
    /\.\.\//,       // Path traversal
    /\.\.\\/,       // Path traversal (Windows)
    /\$\{/,         // Template injection
    /#\{/,          // Template injection (Ruby/SSTI)
    /\{\{/,         // Template injection (Jinja/SSTI)
    /union\s+select/i, // SQL injection
    /or\s+1\s*=\s*1/i, // SQL injection
    /drop\s+table/i,   // SQL injection
  ]

  return dangerousPatterns.some(pattern => pattern.test(input))
}

export function validateId(id: string): boolean {
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    // Strip dangerous protocols from javascript: URLs
    if (parsed.hostname.includes('javascript:') || parsed.hostname.includes('data:')) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}
